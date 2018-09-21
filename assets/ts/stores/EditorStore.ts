import { action, observable } from "mobx";

import Chart from "./Chart";
interface IStore {}

import EditorSetting from "./EditorSetting";
import Asset from "./Asset";
import MusicGameSystem from "./MusicGameSystem";

import { __require, fs } from "../utils/node";
const { remote, ipcRenderer } = __require("electron");
const { dialog } = remote;

export class Editor implements IStore {
  readonly debugMode: boolean = true;

  @observable
  currentChart?: Chart;

  @observable
  currentChartIndex: number = -1;

  @observable
  setting?: EditorSetting;

  @observable
  asset: Asset = new Asset(this.debugMode);

  @observable
  charts: Chart[] = [];

  @action
  setAudioDirectory(path: string) {}

  /**
   * 新規譜面を作成する
   */
  @action
  newChart(musicGameSystem: MusicGameSystem, audioSource: string) {
    const newChart = new Chart(musicGameSystem, audioSource);
    this.charts.push(newChart);
    return newChart;
  }

  @action
  setCurrentChart(chartIndex: number) {
    this.currentChartIndex = chartIndex;
    this.currentChart = this.charts[chartIndex];
  }

  @action
  createEditorSetting() {
    this.setting = new EditorSetting();
  }

  public static instance: Editor | null = null;

  @action
  save() {}

  private dialogFilters = [{ name: "譜面データ", extensions: ["json"] }];

  @action
  saveAs() {
    var fs = __require("fs");

    var window = remote.getCurrentWindow();
    var options = {
      title: "タイトル",
      filters: this.dialogFilters,
      properties: ["openFile", "createDirectory"]
    };
    dialog.showSaveDialog(
      window,
      options,
      // コールバック関数
      function(filename: any) {
        if (filename) {
          writeFile(filename);
        }
      }
    );
    console.log("saved!");

    const writeFile = (path: any) => {
      const data = this.currentChart!.toJSON();

      fs.writeFile(path, data, "utf8", function(err: any) {
        if (err) {
          return console.log(err);
        }
      });
    };
  }

  @action
  open() {
    dialog.showOpenDialog(
      {
        properties: ["openFile", "multiSelections"],
        filters: this.dialogFilters
      },
      async (filenames: string[]) => {
        for (const filename of filenames) {
          const file = await fs.readFile(filename);
          Chart.fromJSON(file.toString());
        }
      }
    );
  }

  constructor() {
    ipcRenderer.on("open", () => this.open());
    ipcRenderer.on("save", () => this.save());
    ipcRenderer.on("saveAs", () => this.saveAs());

    Editor.instance = this;

    const atRandom = (array: any[]) => {
      return array[(Math.random() * array.length) | 0];
    };
    /*

    for (var i = 1; i--; ) {
      this.newChart(
        atRandom(this.asset.musicGameSystems),
        atRandom(this.asset.audioAssetPaths)
      );
    }


    this.setCurrentChart(0);
    
    */
    this.createEditorSetting();
  }
}

export default {
  editor: new Editor()
};
