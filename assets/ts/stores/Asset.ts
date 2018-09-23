import { action, observable } from "mobx";
import Editor from "./EditorStore";
import { guid } from "../util";
import Lane from "../objects/Lane";
import LanePoint from "../objects/LanePoint";

import * as Electrom from "electron";

import { __require } from "../utils/node";

var fs = (window as any).require("fs");

const util = __require("util");
const path = __require("path");

import { getUrlParams } from "../utils/url";

//console.log("fs", fs);
const electron = (window as any).require("electron");
const remote = electron.remote as Electrom.Remote;
const BrowserWindow = remote.BrowserWindow;

import { normalizeMusicGameSystem } from "../stores/MusicGameSystem";

// import * as config from "config";

function parseJSON(text: string) {
  try {
    return JSON.parse(text);
  } catch (e) {
    return {};
  }
}

interface IStore {}

import CustomRendererUtility from "../utils/CustomRendererUtility";

import MusicGameSystem from "./MusicGameSystem";
import { Fraction } from "../math";
import Chart from "./Chart";

export default class Asset implements IStore {
  @observable
  audioAssetPaths: string[] = [];

  @observable
  musicGameSystems: MusicGameSystem[] = [];

  @action
  addMusicGameSystem = (value: MusicGameSystem) =>
    this.musicGameSystems.push(value);

  /**
   * ローカルストレージから譜面を読み込む
   */
  async debugInitialize() {
    if (localStorage.getItem("chart")) {
      Chart.fromJSON(localStorage.getItem("chart")!);
    }
  }

  async loadAssets() {
    const urlParams = getUrlParams();

    // 音源を読み込む
    await this.checkAudioAssetDirectory(decodeURIComponent(urlParams.aap));

    // MusicGameSystem を読み込む
    {
      const directories: any[] = await util.promisify(fs.readdir)(
        urlParams.mgsp
      );

      for (const directory of directories) {
        console.log(directory);

        const files = (await util.promisify(fs.readdir)(
          path.join(urlParams.mgsp, directory)
        )) as any[];

        var fileList = files.filter(file => file.endsWith(".json"));
        console.log(fileList);
        for (const file of fileList) {
          const buffer: Buffer = await util.promisify(fs.readFile)(
            path.join(urlParams.mgsp, directory, file)
          );

          const json = parseJSON(buffer.toString());

          const musicGameSystems = normalizeMusicGameSystem(json);

          (window as any).CustomRendererUtility = CustomRendererUtility;

          // レーンのカスタムレンダラーを読み込む
          {
            const renderers = [
              ...new Set(
                (musicGameSystems.laneTemplates || [])
                  .map(lt => ({ renderer: lt.renderer, lanteTemplate: lt }))
                  .filter(r => r.renderer !== "default")
              )
            ];

            for (const renderer of renderers) {
              const _path = path.join(
                urlParams.mgsp,
                directory,
                renderer.renderer
              );

              const buffer: Buffer = await util.promisify(fs.readFile)(_path);

              const key = guid();

              const source = buffer
                .toString()
                .replace("export default", `window["${key}"] = `);

              eval(source);

              renderer.lanteTemplate.rendererReference = (window as any)[key];
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
              const rendererPath = path.join(
                urlParams.mgsp,
                directory,
                renderer.renderer
              );

              const buffer: Buffer = await util.promisify(fs.readFile)(
                rendererPath
              );

              const key = guid();

              const source = buffer
                .toString()
                .replace("export default", `window["${key}"] = `);

              eval(source);

              console.log("NoteRender!", (window as any)[key], source);

              renderer.noteTemplate.rendererReference = (window as any)[key];
            }
          }

          // ノートラインのカスタムレンダラーを読み込む
          {
            const renderers = musicGameSystems.customNoteLineRenderers || [];

            for (const renderer of renderers) {
              const rendererPath = path.join(
                urlParams.mgsp,
                directory,
                renderer.renderer
              );

              const buffer: Buffer = await util.promisify(fs.readFile)(
                rendererPath
              );
              const key = guid();

              const source = buffer
                .toString()
                .replace("export default", `window["${key}"] = `);

              // console.log(source);

              eval(source);

              renderer.rendererReference = (window as any)[key];
            }
          }

          this.addMusicGameSystem(musicGameSystems);
        }
      }
    }
  }

  constructor(debugMode: boolean) {
    (async () => {
      await this.loadAssets();

      if (debugMode) {
        this.debugInitialize();
      }
    })();
  }

  @action
  pushAudioAssetPath(path: string) {
    this.audioAssetPaths.push(path);
  }

  async loadAudioAsset(path: string) {
    console.log("loadAudioAsset", path);

    const buffer: Buffer = await util.promisify(fs.readFile)(path);

    return buffer;
  }

  @action
  private async checkAudioAssetDirectory(dir: string) {
    const files: any[] = await util.promisify(fs.readdir)(dir);

    var fileList = files.filter(function(file) {
      return (
        fs.statSync(path.join(dir, file)).isFile() && /.*\.wav$/.test(file)
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
    });
    this.checkAudioAssetDirectory(dir);
  }
}
