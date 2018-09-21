import { action, observable } from "mobx";
import { Editor } from "./EditorStore";
import { guid } from "../util";
import Lane from "../objects/Lane";
import LanePoint from "../objects/LanePoint";

import * as Electrom from "electron";

import { __require } from "../utils/node";

var fs = (window as any).require("fs");

const util = __require("util");

import { getUrlParams } from "../utils/url";

//console.log("fs", fs);
const electron = (window as any).require("electron");
const remote = electron.remote as Electrom.Remote;
const BrowserWindow = remote.BrowserWindow;

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

export default class Asset implements IStore {
  @observable
  audioAssetPaths: string[] = [];

  @observable
  musicGameSystems: MusicGameSystem[] = [];

  @action
  addMusicGameSystem = (value: MusicGameSystem) =>
    this.musicGameSystems.push(value);

  async debugInitialize() {
    const urlParams = getUrlParams();

    console.warn(urlParams.aap);
    console.warn(urlParams.mgsp);

    await this.checkAudioAssetDirectory(decodeURIComponent(urlParams.aap));

    // 譜面を読み込む
    const path = this.audioAssetPaths[24];
    const nn = await this.loadAudioAsset(path);
    Editor.instance!.currentChart!.setAudio(nn, path);

    // MusicGameSystem を読み込む
    {
      const directories: any[] = await util.promisify(fs.readdir)(
        urlParams.mgsp
      );

      for (const directory of directories) {
        console.log(directory);

        const files = (await util.promisify(fs.readdir)(
          urlParams.mgsp + "/" + directory
        )) as any[];

        var fileList = files.filter(file => file.endsWith(".json"));
        console.log(fileList);
        for (const file of fileList) {
          const buffer: Buffer = await util.promisify(fs.readFile)(
            urlParams.mgsp + "/" + directory + "/" + file
          );

          const json = parseJSON(buffer.toString());

          const musicGameSystems: MusicGameSystem = Object.assign(
            {
              customNoteLineRenderers: []
            },
            json
          );

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
              const path =
                urlParams.mgsp + "/" + directory + "/" + renderer.renderer;

              const buffer: Buffer = await util.promisify(fs.readFile)(path);

              const source = buffer
                .toString()
                .replace("export default", `window["${path}"] = `);

              console.log(source);

              eval(source);

              renderer.lanteTemplate.rendererReference = (window as any)[path];
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
              const path =
                urlParams.mgsp + "/" + directory + "/" + renderer.renderer;

              const buffer: Buffer = await util.promisify(fs.readFile)(path);

              const source = buffer
                .toString()
                .replace("export default", `window["${path}"] = `);

              console.log(source);

              eval(source);

              renderer.noteTemplate.rendererReference = (window as any)[path];
            }
          }

          // ノートラインのカスタムレンダラーを読み込む
          {
            const renderers = musicGameSystems.customNoteLineRenderers || [];

            for (const renderer of renderers) {
              const path =
                urlParams.mgsp + "/" + directory + "/" + renderer.renderer;

              const buffer: Buffer = await util.promisify(fs.readFile)(path);

              const source = buffer
                .toString()
                .replace("export default", `window["${path}"] = `);

              // console.log(source);

              eval(source);

              renderer.rendererReference = (window as any)[path];
            }
          }

          this.addMusicGameSystem(musicGameSystems);
        }
      }

      const musicGameSystem = this.musicGameSystems.find(mgs =>
        (mgs.name || "").startsWith("o")
      )!;

      Editor.instance!.currentChart!.setMusicGameSystem(musicGameSystem);

      console.log(musicGameSystem, this.musicGameSystems);

      // 譜面データがないなら初期レーンを読み込む
      if (!localStorage.getItem("chart") && musicGameSystem.initialLanes) {
        Editor.instance!.currentChart!.loadInitialLanes();
      }
    }

    if (localStorage.getItem("chart")) {
      Editor.instance!.currentChart!.load(localStorage.getItem("chart")!);
    }
  }

  constructor(debugMode: boolean) {
    if (debugMode) {
      this.debugInitialize();
    }
  }

  @action
  pushAudioAssetPath(path: string) {
    this.audioAssetPaths.push(path);
  }

  async loadAudioAsset(path: string) {
    console.log("loadAudioAsset");

    const buffer: Buffer = await util.promisify(fs.readFile)(path);

    return buffer;
  }

  @action
  private async checkAudioAssetDirectory(dir: string) {
    const files: any[] = await util.promisify(fs.readdir)(dir);

    var fileList = files.filter(function(file) {
      return fs.statSync(dir + "/" + file).isFile() && /.*\.wav$/.test(file); //絞り込み
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
