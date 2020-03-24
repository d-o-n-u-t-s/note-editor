import { ipcRenderer, remote } from "electron";
import * as fs from "fs";
import * as _ from "lodash";
import { action, flow, observable } from "mobx";
import * as Mousetrap from "mousetrap";
import { VariantType } from "notistack";
import * as util from "util";
import { Fraction } from "../math";
import { MeasureRecord } from "../objects/Measure";
import { Note, NoteRecord } from "../objects/Note";
import { OtherObjectRecord } from "../objects/OtherObject";
import { TimelineData } from "../objects/Timeline";
import BMSImporter from "../plugins/BMSImporter";
import { guid } from "../utils/guid";
import AssetStore from "./Asset";
import Chart from "./Chart";
import EditorSetting, { EditMode } from "./EditorSetting";
import MusicGameSystem from "./MusicGameSystem";

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
  notify(text: string, type: VariantType = "info") {
    this.notification = {
      text,
      guid: guid(),
      type
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

  @action
  removeInspectorTarget(target: any) {
    this.inspectorTargets = this.inspectorTargets.filter(x => x !== target);
    target.isSelected = false;
  }

  /**
   * 検証するオブジェクトを初期化する
   */
  @action
  public clearInspectorTarget() {
    for (const target of this.inspectorTargets) {
      target.isSelected = false;
    }
    this.inspectorTargets = [];
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
  asset = new AssetStore(() =>
    this.openCharts(JSON.parse(localStorage.getItem("filePaths") || "[]"))
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

  /**
   * 譜面を切り替える
   * @param chartIndex 切り替える譜面のインデックス
   */
  @action
  public setCurrentChart(chartIndex: number) {
    this.currentChart?.pause();

    this.currentChartIndex = chartIndex;

    if (!this.charts.length) {
      this.currentChart = null;
      return;
    }

    this.currentChart = this.charts[chartIndex];

    // 譜面を切り替えたときは選択ツールに切り替える
    this.setting.setEditMode(EditMode.Select);

    this.setting.editNoteTypeIndex = Math.min(
      this.setting.editNoteTypeIndex,
      this.currentChart.musicGameSystem.noteTypes.length - 1
    );
    this.setting.editLaneTypeIndex = Math.min(
      this.setting.editLaneTypeIndex,
      this.currentChart.musicGameSystem.laneTemplates.length - 1
    );
    this.setting.editOtherTypeIndex = Math.min(
      this.setting.editOtherTypeIndex,
      this.currentChart.musicGameSystem.otherObjectTypes.length - 1
    );
  }

  public static instance: Editor | null = null;

  /**
   * 譜面を保存する
   */
  @action
  private save() {
    const chart = this.currentChart;

    if (!chart) {
      console.warn("譜面を開いていません");
      return;
    }

    if (!chart.filePath) {
      this.saveAs();
      return;
    }

    // 譜面を最適化する
    chart.timeline.optimise();

    chart.musicGameSystem.eventListeners.onSerialize?.(chart);

    // 保存
    const data = chart.toJSON();

    fs.writeFile(chart.filePath!, data, "utf8", (err: any) => {
      if (err) {
        return console.log(err);
      }
    });

    this.notify("譜面を保存しました");

    // イベント発火
    const onSave = chart.musicGameSystem.eventListeners.onSave;
    if (onSave) {
      const alert = onSave(chart);
      if (alert) this.notify(alert, "error");
    }
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

      // その他オブジェクト
      else if (t instanceof OtherObjectRecord) {
        this.inspectorTargets.push(
          this.currentChart!.timeline.otherObjects.find(
            object => object.guid === t.guid
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
      paths => this.openCharts(paths)
    );
  }

  /**
   * 譜面を開く
   * @param filePaths 譜面のパスのリスト
   */
  private openCharts = flow(function*(this: Editor, filePaths: string[]) {
    for (const filePath of filePaths) {
      const file = yield util.promisify(fs.readFile)(filePath);
      Chart.fromJSON(file.toString());
      this.currentChart!.filePath = filePath;
    }
  });

  @action
  copy() {
    this.copiedNotes = this.getInspectNotes();

    this.notify(`${this.copiedNotes.length} 個のオブジェクトをコピーしました`);
  }

  @action
  paste() {
    if (this.inspectorTargets.length != 1) return;
    if (!(this.inspectorTargets[0] instanceof MeasureRecord)) return;
    if (this.copiedNotes.length == 0) return;

    const oldChart = this.copiedNotes[0].chart;
    if (oldChart.musicGameSystem != this.currentChart!.musicGameSystem) {
      this.notify("musicGameSystemが一致しません", "error");
      return;
    }

    const tl = this.currentChart!.timeline;
    if (!this.copiedNotes.every(note => tl.laneMap.has(note.lane))) {
      this.notify("レーンIDが一致しません", "error");
      return;
    }

    const diff =
      this.inspectorTargets[0].index -
      Math.min(...this.copiedNotes.map(note => note.measureIndex));

    const guidMap = new Map<string, string>();
    for (let note of this.copiedNotes) {
      guidMap.set(note.guid, guid());
      note = note.clone();

      // 新旧小節の拍子を考慮して位置を調整
      note.measurePosition = Fraction.mul(
        note.measurePosition,
        Fraction.div(
          oldChart.timeline.measures[note.measureIndex].beat,
          tl.measures[note.measureIndex + diff].beat
        )
      );
      if (note.measurePosition.numerator >= note.measurePosition.denominator)
        continue;

      note.guid = guidMap.get(note.guid)!;
      note.measureIndex += diff;
      note.layer = this.currentChart!.currentLayer.guid;
      note.chart = this.currentChart!;
      tl.addNote(note, false);
    }

    tl.updateNoteMap();

    // ノートラインを複製する
    for (const line of oldChart.timeline.noteLines) {
      if (!guidMap.has(line.head) || !guidMap.has(line.tail)) continue;
      const newLine = _.cloneDeep(line);
      newLine.guid = guid();
      newLine.head = guidMap.get(newLine.head)!;
      newLine.tail = guidMap.get(newLine.tail)!;
      tl.addNoteLine(newLine);
    }

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
      const typeMap = this.currentChart!.musicGameSystem.noteTypeMap;
      const excludeLanes = typeMap.get(note.type)!.excludeLanes || [];
      if (excludeLanes.includes(lane.templateName)) return;

      note.lane = lane.guid;
    });
    if (notes.length > 0) this.currentChart!.save();
  }

  /**
   * 選択中のノートを左右に移動する
   * @param value 移動量
   */
  @action
  private moveSelectedNotes(value: number) {
    const notes = this.getInspectNotes();

    for (const note of notes) {
      const { numerator, denominator } = note.horizontalPosition;
      note.horizontalPosition.numerator = _.clamp(
        numerator + value,
        0,
        denominator - note.horizontalSize
      );
    }
  }

  /**
   * 選択中のノートを左右反転する
   */
  @action
  private flipSelectedNotes() {
    const notes = this.getInspectNotes();

    for (const note of notes) {
      const { numerator, denominator } = note.horizontalPosition;
      note.horizontalPosition.numerator =
        denominator - 1 - numerator - (note.horizontalSize - 1);
    }
  }

  @action
  moveDivision(index: number) {
    const frac = new Fraction(index, this.setting.measureDivision);
    const notes = this.getInspectNotes();
    const measures = this.currentChart!.timeline.measures;

    notes.forEach(note => {
      const p = Fraction.add(
        note.measurePosition,
        Fraction.div(frac, measures[note.measureIndex].beat)
      );
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
    ipcRenderer.on("moveLane", (_: any, index: number) => {
      this.moveLane(i => i + index);
      this.moveSelectedNotes(index);
    });
    ipcRenderer.on("flipLane", () => {
      this.moveLane(i => this.currentChart!.timeline.lanes.length - i - 1);
      this.flipSelectedNotes();
    });

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
      const max = this.currentChart!.musicGameSystem.noteTypes.length - 1;
      this.setting.setEditNoteTypeIndex(Math.min(index, max));
    });

    // 制御
    ipcRenderer.on("toggleMusicPlaying", () =>
      this.currentChart!.isPlaying
        ? this.currentChart!.pause()
        : this.currentChart!.play()
    );

    ipcRenderer.on("reload", () => {
      localStorage.setItem(
        "filePaths",
        JSON.stringify(this.charts.map(c => c.filePath).filter(p => p))
      );
      location.reload();
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
