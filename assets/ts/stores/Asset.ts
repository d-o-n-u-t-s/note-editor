import { action, observable } from "mobx";
import { Editor } from "./EditorStore";
import { guid } from "../util";
import Lane from "../objects/Lane";
import LanePoint from "../objects/LanePoint";

import * as Electrom from "electron";

const __require = (window as any).require;

var fs = (window as any).require("fs");

const util = __require("util");

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

  private async debugInitialize() {
    const urlParams = location.search
      .substr(1)
      .split("&")
      .map(v => v.split("="))
      .reduce((a: any, b: any) => {
        a[b[0]] = b[1];
        return a;
      }, {});

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

          const musicGameSystems: MusicGameSystem = json;

          // カスタムレンダラーを読み込む
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

          this.addMusicGameSystem(musicGameSystems);
        }
      }

      const musicGameSystem = this.musicGameSystems.find(mgs =>
        (mgs.name || "").startsWith("d")
      )!;

      Editor.instance!.currentChart!.setMusicGameSystem(musicGameSystem);

      console.log(musicGameSystem, this.musicGameSystems);

      // 譜面データがないなら初期レーンを読み込む
      if (!localStorage.getItem("chart") && musicGameSystem.initialLanes) {
        for (const initialLane of musicGameSystem.initialLanes) {
          const laneTemplate = musicGameSystem.laneTemplates.find(
            lt => lt.name === initialLane.template
          )!;

          const lanePoints = Array.from({ length: 2 }).map((_, index) => {
            const newLanePoint = {
              measureIndex: index * 50,
              measurePosition: new Fraction(0, 1),
              guid: guid(),
              color: Number(laneTemplate.color),
              horizontalSize: initialLane.horizontalSize,
              templateName: laneTemplate.name,
              horizontalPosition: new Fraction(
                initialLane.horizontalPosition,
                musicGameSystem.measureHorizontalDivision
              )
            } as LanePoint;

            Editor.instance!.currentChart!.timeline.addLanePoint(newLanePoint);

            return newLanePoint.guid;
          });

          const newLane = {
            guid: guid(),
            templateName: laneTemplate.name,
            division: laneTemplate.division,
            points: lanePoints
          } as Lane;
          Editor.instance!.currentChart!.timeline.addLane(newLane);
        }
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
