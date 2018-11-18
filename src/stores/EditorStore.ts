import { action, observable } from "mobx";
import { MeasureRecord } from "../objects/Measure";
import { Note, NoteRecord } from "../objects/Note";
import { TimelineData } from "../objects/Timeline";
import BMSImporter from "../plugins/BMSImporter";
import { guid } from "../util";
import { fs, __require } from "../utils/node";
import AssetStore from "./Asset";
import Chart from "./Chart";
import EditorSetting from "./EditorSetting";
import MusicGameSystem from "./MusicGameSystem";

const { remote, ipcRenderer } = __require("electron");
const { dialog } = remote;

export default class Editor {
  @observable.ref
  inspectorTarget: any = {};

  copiedNotes: Note[] = [];

  @action
  setInspectorTarget(target: any) {
    this.inspectorTarget = target;
  }

  getInspectNotes(): Note[] {
    if (this.inspectorTarget instanceof NoteRecord) {
      return [this.inspectorTarget];
    }
    if (this.inspectorTarget instanceof MeasureRecord) {
      return this.currentChart!.timeline.notes.filter(
        n => n.data.measureIndex == this.inspectorTarget.data.index
      );
    }
    return [];
  }

  @observable
  currentChart: Chart | null = null;

  @observable
  currentChartIndex: number = -1;

  @observable
  setting = new EditorSetting();

  @observable
  asset: AssetStore = new AssetStore(() =>
    this.openFiles(JSON.parse(localStorage.getItem("filePaths") || "[]"))
  );

  @observable
  charts: Chart[] = [];

  @action
  setAudioDirectory(path: string) {}

  /**
   * 新規譜面を作成する
   */
  @action
  newChart(
    musicGameSystem: MusicGameSystem,
    audioSource: string,
    data?: TimelineData
  ) {
    const newChart = new Chart(musicGameSystem, audioSource);
    this.charts.push(newChart);
    return newChart;
  }

  /**
   * 譜面を削除する
   */
  @action
  removeChart(chartIndex: number) {
    this.saveConfirm(chartIndex);
    this.charts = this.charts.filter((_, index) => index !== chartIndex);
    this.setCurrentChart(0);
  }

  @action
  setCurrentChart(chartIndex: number) {
    this.currentChartIndex = chartIndex;

    if (!this.charts.length) {
      this.currentChart = null;
      return;
    }

    this.currentChart = this.charts[chartIndex];
  }

  public static instance: Editor | null = null;

  @action
  save() {
    if (!this.currentChart) {
      console.warn("譜面を開いていません");
      return;
    }

    if (!this.currentChart!.filePath) {
      this.saveAs();
      return;
    }

    // 譜面を最適化する
    this.currentChart!.timeline.optimise();

    // 保存
    const data = this.currentChart!.toJSON();
    fs.writeFile(this.currentChart!.filePath, data, "utf8", function(err: any) {
      if (err) {
        return console.log(err);
      }
    });

    // イベント発火
    const onSave = this.currentChart.musicGameSystem!.eventListeners.onSave;
    if (onSave) onSave(this.currentChart);
  }

  private dialogFilters = [{ name: "譜面データ", extensions: ["json"] }];

  @action
  saveAs() {
    var window = remote.getCurrentWindow();
    var options = {
      title: "タイトル",
      filters: this.dialogFilters,
      properties: ["openFile", "createDirectory"]
    };
    dialog.showSaveDialog(window, options, (filePath: any) => {
      if (filePath) {
        this.currentChart!.filePath = filePath;
        this.save();
      }
    });
  }

  saveConfirm(chartIndex: number) {
    if (
      this.charts[chartIndex].filePath &&
      confirm(this.charts[chartIndex].name + " を保存しますか？")
    ) {
      this.setCurrentChart(chartIndex);
      this.save();
    }
  }

  @action
  open() {
    dialog.showOpenDialog(
      {
        properties: ["openFile", "multiSelections"],
        filters: this.dialogFilters
      },
      (paths: any) => this.openFiles(paths)
    );
  }

  async openFiles(filePaths: string[]) {
    for (const filePath of filePaths) {
      const file = await fs.readFile(filePath);
      Chart.fromJSON(file.toString());
      this.currentChart!.filePath = filePath;
    }
  }

  @action
  copy() {
    this.copiedNotes = this.getInspectNotes();
  }

  @action
  paste() {
    if (!(this.inspectorTarget instanceof MeasureRecord)) return;
    this.copiedNotes.forEach(note => {
      //   note.guid = guid();

      this.currentChart!.timeline.addNote(
        note
          .set("guid", guid())
          .set("measureIndex", this.inspectorTarget.data.index)
      );
    });
  }

  @action
  changeMeasureDivision(index: number) {
    const divs = EditorSetting.MEASURE_DIVISIONS;
    index += divs.indexOf(this.setting.measureDivision);
    index = Math.max(0, Math.min(divs.length - 1, index));
    this.setting.measureDivision = divs[index];
  }

  @action
  moveLane(indexer: (i: number) => number) {
    const lanes = this.currentChart!.timeline.lanes;

    this.getInspectNotes().forEach(note => {
      // 移動先レーンを取得
      const lane =
        lanes[indexer(lanes.findIndex(lane => lane.guid === note.data.lane))];
      if (lane === undefined) return;

      // 置けないならやめる
      const typeMap = this.currentChart!.musicGameSystem!.noteTypeMap;
      const excludeLanes = typeMap.get(note.data.type)!.excludeLanes || [];
      if (excludeLanes.includes(lane.templateName)) return;

      //note.data.lane = lane.guid;
    });
  }

  constructor() {
    // ファイル
    ipcRenderer.on("open", () => this.open());
    ipcRenderer.on("save", () => this.save());
    ipcRenderer.on("saveAs", () => this.saveAs());
    ipcRenderer.on("importBMS", () => BMSImporter.import());

    // 編集1
    ipcRenderer.on("cut", () => {
      this.copy();
      this.copiedNotes.forEach(n => this.currentChart!.timeline.removeNote(n));
    });
    ipcRenderer.on("copy", () => this.copy());
    ipcRenderer.on("paste", () => this.paste());
    ipcRenderer.on("moveLane", (_: any, index: number) =>
      this.moveLane(i => i + index)
    );
    ipcRenderer.on("flipLane", () =>
      this.moveLane(i => this.currentChart!.timeline.lanes.length - i - 1)
    );

    // 選択
    ipcRenderer.on("changeMeasureDivision", (_: any, index: number) =>
      this.changeMeasureDivision(index)
    );
    ipcRenderer.on("changeObjectSize", (_: any, index: number) =>
      this.setting.setObjectSize(Math.max(1, this.setting.objectSize + index))
    );
    ipcRenderer.on("changeEditMode", (_: any, index: number) =>
      this.setting.setEditMode(index)
    );
    ipcRenderer.on("changeNoteTypeIndex", (_: any, index: number) => {
      const max = this.currentChart!.musicGameSystem!.noteTypes.length - 1;
      this.setting.setEditNoteTypeIndex(Math.min(index, max));
    });

    // テスト処理
    /*
    if (localStorage.getItem("_test_bms_chart")) {
      setTimeout(() => {
        BMSImporter.importImplement(localStorage.getItem("_test_bms_chart")!);
      }, 1000);
    }
    */

    ipcRenderer.on("close", () => {
      for (let i = 0; i < this.charts.length; i++) this.saveConfirm(i);
      localStorage.setItem(
        "filePaths",
        JSON.stringify(this.charts.map(c => c.filePath).filter(p => p))
      );
    });

    Editor.instance = this;

    const atRandom = (array: any[]) => {
      return array[(Math.random() * array.length) | 0];
    };
  }
}
