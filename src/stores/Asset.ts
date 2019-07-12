import { ipcRenderer, remote } from "electron";
import * as fs from "fs";
import { action, observable } from "mobx";
import * as path from "path";
import * as util from "util";
import {
  CustomNoteLineRenderer,
  HowlPool,
  LaneTemplate,
  normalizeMusicGameSystem,
  NoteType
} from "../stores/MusicGameSystem";
import { guid } from "../utils/guid";
import CustomRendererUtility from "../utils/CustomRendererUtility";
import MusicGameSystem from "./MusicGameSystem";

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
  audioAssetPaths: string[] = [];

  @observable
  musicGameSystems: MusicGameSystem[] = [];

  @action
  addMusicGameSystem = (value: MusicGameSystem) =>
    this.musicGameSystems.push(value);

  async loadAssets() {
    const urlParams = await this.getAssetPath;

    // 音源を読み込む
    await this.checkAudioAssetDirectory(decodeURIComponent(urlParams.aap));

    // MusicGameSystem を読み込む
    {
      const directories: any[] = await util.promisify(fs.readdir)(
        urlParams.mgsp
      );

      for (const directory of directories) {
        const dirPath = path.join(urlParams.mgsp, directory);
        if (!fs.statSync(dirPath).isDirectory()) continue;

        const files = (await util.promisify(fs.readdir)(dirPath)) as any[];

        var fileList = files.filter(file => file.endsWith(".json"));
        console.log("MusicGameSystem を読み込みます", fileList);
        for (const file of fileList) {
          const buffer: Buffer = await util.promisify(fs.readFile)(
            path.join(urlParams.mgsp, directory, file)
          );

          const json = parseJSON(buffer.toString());
          await this.loadMusicGameSystem(json, urlParams.mgsp, directory);
        }
      }
    }
  }

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
   * 外部のスクリプトをインポートする
   * @param path *.js ファイルのパス
   */
  async import(path: string) {
    const buffer: Buffer = await util.promisify(fs.readFile)(path);

    const key = guid();

    (window as any).exports = { __esModule: true };

    const source = buffer
      .toString()
      .replace(`exports.__esModule = true;`, "")
      .replace("export default", `window["${key}"] = `)
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
      name: "Speed",
      color: "0x00ff00"
    });
    musicGameSystems.otherObjectTypes.unshift({
      name: "BPM",
      color: "0xff0000"
    });

    // イベントリスナーを読み込む
    if (musicGameSystems.eventListener) {
      musicGameSystems.eventListeners = await this.import(
        path.join(rootPath, directory, musicGameSystems.eventListener)
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
      for (const prop of noteType.customProps.filter(p => p.config)) {
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

    (window as any).CustomRendererUtility = CustomRendererUtility;

    // レーンのカスタムレンダラーを読み込む
    {
      const renderers = [
        ...new Set(
          musicGameSystems.laneTemplates
            .map(lt => ({ renderer: lt.renderer, laneTemplate: lt }))
            .filter(r => r.renderer !== "default")
        )
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
            .map(lt => ({ renderer: lt.renderer, noteTemplate: lt }))
            .filter(r => r.renderer !== "default")
        )
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

  getAssetPath = new Promise<IAssetPath>(resolve => {
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

  @action
  pushAudioAssetPath(path: string) {
    this.audioAssetPaths.push(path);
  }

  loadAudioAsset(path: string) {
    console.log("loadAudioAsset", path);

    const buffer: Buffer = fs.readFileSync(path);

    return buffer;
  }

  @action
  private async checkAudioAssetDirectory(dir: string) {
    const files: any[] = await util.promisify(fs.readdir)(dir);

    var fileList = files.filter(function(file) {
      return (
        fs.statSync(path.join(dir, file)).isFile() &&
        /.*\.(wav|mp3)$/.test(file)
      ); //絞り込み
    });

    for (const fileName of fileList) {
      this.pushAudioAssetPath(`${dir}/${fileName}`);
    }
  }

  @action
  openAudioAssetDirectory() {
    const [dir] = remote.dialog.showOpenDialog({
      properties: ["openDirectory"]
    })!;
    this.checkAudioAssetDirectory(dir);
  }
}
