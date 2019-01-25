import * as _ from "lodash";
import { action, observable } from "mobx";
import * as Mousetrap from "mousetrap";
import { Fraction } from "../math";
import { BpmChangeRecord } from "../objects/BPMChange";
import { MeasureRecord } from "../objects/Measure";
import { Note, NoteRecord } from "../objects/Note";
import { SpeedChangeRecord } from "../objects/SpeedChange";
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
  /**
   * エディタの起動時間
   */
  currentFrame = 0;

  @observable.ref
  inspectorTargets: any[] = [];

  copiedNotes: Note[] = [];

  @observable.ref
  notification: any = {};

  /**
   * 通知
   * @param text 通知内容
   */
  @action
  notify(text: string) {
    this.notification = {
      text,
      guid: guid()
    };
  }

  @action
  setInspectorTarget(target: any) {
    for (const target of this.inspectorTargets) {
      target.isSelected = false;
    }
    this.inspectorTargets = [target];
    target.isSelected = true;
  }

  @action
  addInspectorTarget(target: any) {
    this.inspectorTargets = _.uniq([...this.inspectorTargets, target]);
    target.isSelected = true;
  }

  getInspectNotes(): Note[] {
    const notes = [];
    for (const target of this.inspectorTargets) {
      if (target instanceof NoteRecord) {
        notes.push(target);
      }
      if (target instanceof MeasureRecord) {
        notes.push(
          ...this.currentChart!.timeline.notes.filter(
            n => n.measureIndex == target.index
          )
        );
      }
    }
    return notes;
  }

  @observable.ref
  currentChart: Chart | null = null;

  @observable
  currentChartIndex: number = 0;

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

    this.notify("譜面を保存しました");

    // イベント発火
    const onSave = this.currentChart.musicGameSystem!.eventListeners.onSave;
    if (onSave) onSave(this.currentChart);
  }

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

  /**
   * インスペクタの対象を更新する
   */
  @action
  updateInspector() {
    const targets = this.inspectorTargets;
    this.inspectorTargets = [];

    for (const t of targets) {
      // ノート
      if (t instanceof NoteRecord) {
        const note = this.currentChart!.timeline.noteMap.get(t.guid);
        if (note) this.inspectorTargets.push(note);
      }

      // BPM 変更
      else if (t instanceof BpmChangeRecord) {
        this.inspectorTargets.push(
          this.currentChart!.timeline.bpmChanges.find(
            bpmChange => bpmChange.guid === t.guid
          )
        );
      }

      // 速度変更
      else if (t instanceof SpeedChangeRecord) {
        this.inspectorTargets.push(
          this.currentChart!.timeline.speedChanges.find(
            speedChange => speedChange.guid === t.guid
          )
        );
      }

      // その他
      else {
        this.inspectorTargets.push(t);
      }
    }
  }

  private dialogFilters = [{ name: "譜面データ", extensions: ["json"] }];

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

    this.notify(`${this.copiedNotes.length} 個のオブジェクトをコピーしました`);
  }

  @action
  paste() {
    if (this.inspectorTargets.length != 1) return;
    if (!(this.inspectorTargets[0] instanceof MeasureRecord)) return;

    const diff =
      this.inspectorTargets[0].index -
      Math.min(...this.copiedNotes.map(note => note.measureIndex));

    const guidMap = new Map<string, string>();
    for (let note of this.copiedNotes) {
      guidMap.set(note.guid, guid());
      note = note.clone();
      note.guid = guidMap.get(note.guid)!;
      note.measureIndex += diff;
      this.currentChart!.timeline.addNote(note, false);
    }

    this.currentChart!.timeline.updateNoteMap();

    this.currentChart!.timeline.noteLines.forEach(line => {
      if (guidMap.has(line.head) && guidMap.has(line.tail)) {
        line = _.cloneDeep(line);
        line.head = guidMap.get(line.head)!;
        line.tail = guidMap.get(line.tail)!;
        this.currentChart!.timeline.addNoteLine(line);
      }
    });

    this.notify(`${this.copiedNotes.length} 個のオブジェクトを貼り付けました`);

    if (this.copiedNotes.length > 0) this.currentChart!.save();
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
    const notes = this.getInspectNotes();

    notes.forEach(note => {
      // 移動先レーンを取得
      const lane =
        lanes[indexer(lanes.findIndex(lane => lane.guid === note.lane))];
      if (lane === undefined) return;

      // 置けないならやめる
      const typeMap = this.currentChart!.musicGameSystem!.noteTypeMap;
      const excludeLanes = typeMap.get(note.type)!.excludeLanes || [];
      if (excludeLanes.includes(lane.templateName)) return;

      note.lane = lane.guid;
    });
    if (notes.length > 0) this.currentChart!.save();
  }

  @action
  moveDivision(index: number) {
    const frac = new Fraction(index, this.setting.measureDivision);
    const notes = this.getInspectNotes();

    notes.forEach(note => {
      const p = Fraction.add(note.measurePosition, frac);
      if (p.numerator < 0 && note.measureIndex != 0) {
        note.measureIndex--;
        p.numerator += p.denominator;
      }
      if (p.numerator >= p.denominator) {
        note.measureIndex++;
        p.numerator -= p.denominator;
      }
      note.measurePosition = p;
    });
    this.currentChart!.timeline.calculateTime();
    if (notes.length > 0) this.currentChart!.save();
  }

  constructor() {
    // ファイル
    ipcRenderer.on("open", () => this.open());
    ipcRenderer.on("save", () => this.save());
    ipcRenderer.on("saveAs", () => this.saveAs());
    ipcRenderer.on("importBMS", () => BMSImporter.import());

    // 編集
    Mousetrap.bind("mod+z", () => this.currentChart!.timeline.undo());
    Mousetrap.bind("mod+shift+z", () => this.currentChart!.timeline.redo());
    Mousetrap.bind("mod+x", () => {
      this.copy();
      this.copiedNotes.forEach(n => this.currentChart!.timeline.removeNote(n));
      if (this.copiedNotes.length > 0) this.currentChart!.save();
    });
    Mousetrap.bind("mod+c", () => this.copy());
    Mousetrap.bind("mod+v", () => this.paste());

    ipcRenderer.on("moveDivision", (_: any, index: number) =>
      this.moveDivision(index)
    );
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

    ipcRenderer.on("close", () => {
      for (let i = 0; i < this.charts.length; i++) this.saveConfirm(i);
      localStorage.setItem(
        "filePaths",
        JSON.stringify(this.charts.map(c => c.filePath).filter(p => p))
      );
    });

    Editor.instance = this;
  }
}
