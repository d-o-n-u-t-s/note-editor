import { ipcRenderer, remote } from "electron";
import * as fs from "fs";
import * as _ from "lodash";
import { action, flow, observable } from "mobx";
import * as path from "path";
import * as util from "util";
import {
  CustomNoteLineRenderer,
  HowlPool,
  LaneTemplate,
  normalizeMusicGameSystem,
  NoteType,
} from "../stores/MusicGameSystem";
import { guid } from "../utils/guid";
import { replaceAsync } from "../utils/string";
import MusicGameSystem from "./MusicGameSystem";
import IMusicGameSystemEventListener from "./musicGameSystem/eventListener";

function parseJSON(text: string) {
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error(e);
    return {};
  }
}

interface IAssetPath {
  aap: string;
  mgsp: string;
}

export default class AssetStore {
  @observable
  audioAssetPath: string = "";

  @observable
  musicGameSystems: MusicGameSystem[] = [];

  @action
  addMusicGameSystem = (value: MusicGameSystem) =>
    this.musicGameSystems.push(value);

  private loadAssets = flow(function* (this: AssetStore) {
    const urlParams = yield this.getAssetPath;

    // 音源のパスを設定する
    this.audioAssetPath = decodeURIComponent(urlParams.aap);

    // MusicGameSystem を読み込む
    {
      const directories: any[] = yield util.promisify(fs.readdir)(
        urlParams.mgsp
      );

      for (const directory of directories) {
        const dirPath = path.join(urlParams.mgsp, directory);
        if (!fs.statSync(dirPath).isDirectory()) continue;

        const files = (yield util.promisify(fs.readdir)(dirPath)) as any[];

        var fileList = files.filter((file) => file.endsWith(".json"));
        console.log("MusicGameSystem を読み込みます", fileList);
        for (const file of fileList) {
          const buffer: Buffer = yield util.promisify(fs.readFile)(
            path.join(urlParams.mgsp, directory, file)
          );

          const json = parseJSON(buffer.toString());
          yield this.loadMusicGameSystem(json, urlParams.mgsp, directory);
        }
      }
    }
  });

  /**
   * 音源を読み込む
   * @param path 音源のパス
   */
  async loadAudio(path: string) {
    const extension = path.split(".").pop()!;

    const buffer = await util.promisify(fs.readFile)(path);

    const blob = new Blob([buffer], { type: `audio/${extension}` });
    const src = URL.createObjectURL(blob);

    return new Howl({ src: src, format: [extension] });
  }

  /**
   * 外部のスクリプトを読み込む
   * @param scriptPath *.js ファイルのパス
   */
  private async readScript(scriptPath: string): Promise<string> {
    const source = (await util.promisify(fs.readFile)(scriptPath)).toString();

    // include コメントを処理する
    return await replaceAsync(source, /\/\/ *include.+/g, async (match) => {
      const includePath = path.join(
        path.dirname(scriptPath),
        match.split(" ").pop()!
      );
      return await this.readScript(includePath);
    });
  }

  /**
   * 外部のスクリプトをインポートする
   * @param scriptPath *.js ファイルのパス
   */
  private async import(scriptPath: string) {
    const key = guid();

    (window as any).exports = { __esModule: true };

    const script = await this.readScript(scriptPath);

    const source = script
      .replace(`exports.__esModule = true;`, "")
      .replace("export default", `window["${key}"] = `)
      .replace("exports.default", `window["${key}"]`)
      .replace(`exports["default"]`, `window["${key}"]`);

    eval(source);

    return (window as any)[key];
  }

  /**
   * 音ゲーシステムを読み込む
   * @param json 対象 JSON
   * @param rootPath 音ゲーシステムのパス
   * @param directory 音ゲーシステムの階層
   */
  async loadMusicGameSystem(json: any, rootPath: string, directory: string) {
    const musicGameSystems = normalizeMusicGameSystem(json);

    // その他オブジェクトのデフォルト値を追加
    musicGameSystems.otherObjectTypes.unshift({
      name: "Stop",
      color: "0x0000ff",
    });
    musicGameSystems.otherObjectTypes.unshift({
      name: "Speed",
      color: "0x00ff00",
    });
    musicGameSystems.otherObjectTypes.unshift({
      name: "BPM",
      color: "0xff0000",
    });

    // イベントリスナーを読み込む
    if (musicGameSystems.eventListener) {
      // 1 ファイルだけなら配列にする
      if (_.isString(musicGameSystems.eventListener)) {
        musicGameSystems.eventListener = [musicGameSystems.eventListener];
      }

      const importedEventListeners: IMusicGameSystemEventListener[] = [];
      for (const eventListener of musicGameSystems.eventListener) {
        importedEventListeners.push(
          await this.import(path.join(rootPath, directory, eventListener))
        );
      }

      // 複数のイベントリスナーをマージする
      musicGameSystems.eventListeners = Object.assign(
        {},
        ...importedEventListeners
      );
    }

    // SE マップを生成する
    musicGameSystems.seMap = new Map<string, HowlPool>();

    // 名前をキーにしたレーンテンプレートのマップを生成する
    musicGameSystems.laneTemplateMap = new Map<string, LaneTemplate>();
    for (const laneTemplate of musicGameSystems.laneTemplates) {
      musicGameSystems.laneTemplateMap.set(laneTemplate.name, laneTemplate);
    }

    // 名前をキーにしたノートタイプのマップを生成する
    musicGameSystems.noteTypeMap = new Map<string, NoteType>();
    for (const noteType of musicGameSystems.noteTypes || []) {
      if (!noteType.customProps) noteType.customProps = [];

      // config生成
      noteType.customPropsInspectorConfig = {};
      for (const prop of noteType.customProps.filter((p) => p.config)) {
        noteType.customPropsInspectorConfig[prop.key] = prop.config;
      }

      // 判定音源を読み込む
      if (noteType.editorProps.se) {
        const sePath = path.join(rootPath, directory, noteType.editorProps.se);
        musicGameSystems.seMap.set(
          noteType.name,
          new HowlPool(async () => await this.loadAudio(sePath), 10)
        );
      }

      musicGameSystems.noteTypeMap.set(noteType.name, noteType);
    }

    // レーンのカスタムレンダラーを読み込む
    {
      const renderers = [
        ...new Set(
          musicGameSystems.laneTemplates
            .map((lt) => ({ renderer: lt.renderer, laneTemplate: lt }))
            .filter((r) => r.renderer !== "default")
        ),
      ];

      for (const renderer of renderers) {
        renderer.laneTemplate.rendererReference = await this.import(
          path.join(rootPath, directory, renderer.renderer)
        );
      }
    }

    // ノートのカスタムレンダラーを読み込む
    {
      const renderers = [
        ...new Set(
          (musicGameSystems.noteTypes || [])
            .map((lt) => ({ renderer: lt.renderer, noteTemplate: lt }))
            .filter((r) => r.renderer !== "default")
        ),
      ];

      for (const renderer of renderers) {
        renderer.noteTemplate.rendererReference = await this.import(
          path.join(rootPath, directory, renderer.renderer)
        );
      }
    }

    // ノートラインのカスタムレンダラーを読み込む
    {
      const renderers = musicGameSystems.customNoteLineRenderers || [];
      musicGameSystems.customNoteLineRendererMap = new Map<
        string,
        CustomNoteLineRenderer
      >();

      for (const renderer of renderers) {
        renderer.rendererReference = await this.import(
          path.join(rootPath, directory, renderer.renderer)
        );

        musicGameSystems.customNoteLineRendererMap.set(
          renderer.target,
          renderer
        );
      }
    }

    // 小節のカスタムレンダラーを読み込む
    {
      const measureRenderer = musicGameSystems.measure.renderer;

      if (measureRenderer !== "default") {
        musicGameSystems.measure.rendererReference = await this.import(
          path.join(rootPath, directory, measureRenderer)
        );
      }
    }

    this.addMusicGameSystem(musicGameSystems);
  }

  private assetPathResolve?: (assetPath: IAssetPath) => void;

  getAssetPath = new Promise<IAssetPath>((resolve) => {
    this.assetPathResolve = resolve;
  });

  constructor(initializer: () => void) {
    ipcRenderer.on("assets", (_: any, assetPath: IAssetPath) => {
      this.assetPathResolve!(assetPath);
    });

    (async () => {
      await this.loadAssets();
      initializer();
    })();
  }

  loadAudioAsset(fileName: string) {
    // サブディレクトリも検索
    const findRecursive = (dir: string): string | undefined => {
      for (const file of fs.readdirSync(dir)) {
        const filePath = path.join(dir, file);
        if (file == fileName) return filePath;
        if (fs.statSync(filePath).isDirectory()) {
          const result = findRecursive(filePath);
          if (result) return result;
        }
      }
    };

    console.log("loadAudioAsset", fileName);
    const foundPath = findRecursive(this.audioAssetPath);
    if (!foundPath) return;

    const buffer: Buffer = fs.readFileSync(foundPath);

    return buffer;
  }

  @action
  openAudioAssetDirectory() {
    remote.dialog
      .showOpenDialog({
        properties: ["openDirectory"],
      })
      .then((result) => (this.audioAssetPath = result.filePaths[0]));
  }
}
