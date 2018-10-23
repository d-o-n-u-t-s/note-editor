import { action, observable } from "mobx";

import Chart from "./Chart";

interface IStore {
  readonly name: string;
}

import EditorSetting from "./EditorSetting";
import Asset from "./Asset";
import MusicGameSystem from "./MusicGameSystem";

import { __require, fs } from "../utils/node";
import BMSImporter from "../plugins/BMSImporter";
const { remote, ipcRenderer } = __require("electron");
const { dialog } = remote;

export default class Editor implements IStore {
  readonly name = "editor";

  readonly debugMode: boolean = true;

  @observable
  inspectorTarget: any = {
    message: "Hello World２",
    displayOutline: false,
    maxSize: 6.0,
    scale: 5,
    aaa: "[1, 2, 3]"
  };

  @action
  setInspectorTarget(target: any) {
    this.inspectorTarget = target;
  }

  @observable
  currentChart?: Chart;

  @observable
  currentChartIndex: number = -1;

  @observable
  setting = new EditorSetting();

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

  public static instance: Editor | null = null;

  @action
  save() {}

  private dialogFilters = [{ name: "譜面データ", extensions: ["json"] }];

  @action
  saveAs() {
    // 譜面を最適化する
    this.currentChart!.timeline.optimise();

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
    ipcRenderer.on("importBMS", () => BMSImporter.import());

    // テスト処理
    /*
    if (localStorage.getItem("_test_bms_chart")) {
      setTimeout(() => {
        BMSImporter.importImplement(localStorage.getItem("_test_bms_chart")!);
      }, 1000);
    }
    */

    Editor.instance = this;

    const atRandom = (array: any[]) => {
      return array[(Math.random() * array.length) | 0];
    };
  }
}
