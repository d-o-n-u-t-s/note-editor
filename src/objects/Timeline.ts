import * as jsonpatch from "fast-json-patch";
import { Record } from "immutable";
import { action, observable } from "mobx";
import { Mutable } from "src/utils/mutable";
import { Fraction } from "../math";
import Chart from "../stores/Chart";
import Editor from "../stores/EditorStore";
import { TimeCalculator } from "../utils/TimeCalculator";
import { Lane, LaneData, LaneRecord } from "./Lane";
import { LanePoint, LanePointData, LanePointRecord } from "./LanePoint";
import { Measure, MeasureData, MeasureRecord, sortMeasure } from "./Measure";
import { Note, NoteData, NoteRecord } from "./Note";
import { NoteLine, NoteLineData, NoteLineRecord } from "./NoteLine";
import { OtherObject, OtherObjectData, OtherObjectRecord } from "./OtherObject";

export type TimelineJsonData = {
  notes: NoteData[];
  noteLines: NoteLineData[];
  measures: MeasureData[];
  lanes: LaneData[];
  lanePoints: LanePointData[];
  otherObjects: OtherObjectData[];
};

export type TimelineData = {
  notes: Note[];
  noteLines: NoteLine[];
  measures: Measure[];
  lanes: Lane[];
  lanePoints: LanePoint[];
  otherObjects: OtherObject[];
};

const defaultTimelineData: TimelineData = {
  notes: [],
  noteLines: [],
  measures: [],
  lanes: [],
  lanePoints: [],
  otherObjects: []
};

type History = {
  undo: jsonpatch.Operation[];
  redo: jsonpatch.Operation[];
};

export type Timeline = Mutable<TimelineRecord>;

export class TimelineRecord extends Record<TimelineData>(defaultTimelineData) {
  static new(chart: Chart, data?: TimelineData): Timeline {
    let timeline = new TimelineRecord(chart, data);
    timeline = Object.assign(timeline, timeline.asMutable());

    timeline.chart = chart;

    timeline.toMutable(timeline);

    timeline.save();

    return timeline;
  }

  /**
   * 各 Record を mutable に変換する
   */
  private toMutable(data: TimelineJsonData) {
    this.mutable.notes = data.notes.map(note =>
      NoteRecord.new(note, this.chart!)
    );
    this.mutable.noteLines = data.noteLines.map(noteLine =>
      NoteLineRecord.new(noteLine)
    );
    this.mutable.measures = data.measures.map(measure =>
      MeasureRecord.new(measure, this.chart!.musicGameSystem!.measure)
    );
    this.mutable.lanes = data.lanes.map(lane => LaneRecord.new(lane));
    this.mutable.lanePoints = data.lanePoints.map(lanePoint =>
      LanePointRecord.new(lanePoint)
    );
    this.mutable.otherObjects = data.otherObjects.map(object =>
      OtherObjectRecord.new(object)
    );

    this.updateNoteMap();
    this.updateLanePointMap();
    this.updateLaneMap();
  }

  static newnew(chart: Chart, data?: TimelineData): Timeline {
    const timeline = new TimelineRecord(chart, data);
    return Object.assign(timeline, timeline.asMutable());
  }

  private constructor(chart: Chart, data?: TimelineData) {
    super(data);
  }

  timeCalculator = new TimeCalculator([], []);

  /**
   * 判定時間を更新する
   */
  @action
  calculateTime() {
    this.timeCalculator = new TimeCalculator(
      [...this.otherObjects].sort(sortMeasure),
      this.measures
    );

    for (const note of this.notes) {
      // 判定時間を更新する
      note.editorProps.time = this.timeCalculator.getTime(
        note.measureIndex + Fraction.to01(note.measurePosition)
      );
    }

    console.info("判定時間を更新しました");
  }

  /**
   * 水平レーン分割数
   */
  @observable
  horizontalLaneDivision: number = 16;

  addOtherObject(object: OtherObject) {
    this.otherObjects.push(object);
    if (object.isBPM()) this.calculateTime();
  }

  removeOtherObject(object: OtherObject) {
    this.mutable.otherObjects = this.otherObjects.filter(obj => obj !== object);
    if (object.isBPM()) this.calculateTime();
  }

  @action
  setMeasures(measures: Measure[]) {
    this.mutable.measures = measures;
  }

  private histories: History[] = [];

  private historyIndex = 0;

  private prevData: TimelineData | null = null;

  private get mutable() {
    return this as Mutable<TimelineRecord>;
  }

  /**
   * 初回セーブ
   */
  private initialSave() {
    const a = defaultTimelineData;
    const b = this.toJS();

    this.histories.push({
      undo: jsonpatch.compare(a, b),
      redo: jsonpatch.compare(b, a)
    });

    this.historyIndex++;
    this.prevData = this.toJS();
  }

  /**
   * 譜面情報をセーブする
   */
  public save() {
    // 初回
    if (this.histories.length === 0) {
      this.initialSave();
      return;
    }

    this.histories = this.histories.slice(0, this.historyIndex);

    const a = this.prevData;
    const b = this.toJS();

    this.histories.push({
      undo: jsonpatch.compare(jsonpatch.deepClone(a), b),
      redo: jsonpatch.compare(b, jsonpatch.deepClone(a))
    });

    this.historyIndex++;

    this.chart!.canUndo = true;
    this.chart!.canRedo = false;

    Editor.instance!.updateInspector();

    this.prevData = this.toJS();
  }

  @action
  public undo() {
    if (!this.chart!.canUndo) return;

    this.historyIndex--;

    const data = jsonpatch.applyPatch(
      jsonpatch.deepClone(this.prevData) as TimelineData,
      this.histories[this.historyIndex].redo
    ).newDocument;

    this.prevData = data;
    this.toMutable(data);

    this.chart!.canRedo = true;
    this.chart!.canUndo = this.historyIndex > 1;

    Editor.instance!.updateInspector();
  }

  @action
  public redo() {
    if (!this.chart!.canRedo) return;
    this.historyIndex++;

    const data = jsonpatch.applyPatch(
      jsonpatch.deepClone(this.prevData) as TimelineData,
      this.histories[this.historyIndex - 1].undo
    ).newDocument;

    this.prevData = data;
    this.toMutable(data);

    this.chart!.canUndo = true;
    this.chart!.canRedo = this.historyIndex < this.histories.length;

    Editor.instance!.updateInspector();
  }

  /**
   * notes 変更
   */
  updateNoteMap() {
    this.noteMap.clear();

    for (const note of this.notes) {
      this.noteMap.set(note.guid, note);
    }
    console.log("NoteMap を更新しました");

    this.calculateTime();
  }

  noteMap = new Map<string, Note>();

  private chart: Chart | null = null;

  addNote(note: Note, updateNoteMap = true) {
    this.notes.push(note);
    if (updateNoteMap) this.updateNoteMap();
  }

  removeNote(note: Note, updateNoteMap = true) {
    // ノートを参照しているノートラインを削除する
    for (const noteLine of this.noteLines.filter(
      noteLine => noteLine.head === note.guid || noteLine.tail === note.guid
    )) {
      this.removeNoteLine(noteLine);
    }

    (this as Mutable<TimelineRecord>).notes = this.notes.filter(
      _note => _note != note
    );

    if (updateNoteMap) this.updateNoteMap();
  }

  addNoteLine(noteLine: NoteLine) {
    this.noteLines.push(noteLine);
  }

  removeNoteLine(noteLine: NoteLine) {
    this.mutable.noteLines = this.noteLines.filter(_note => _note != noteLine);
  }

  lanePointMap = new Map<string, LanePoint>();

  updateLanePointMap() {
    this.lanePointMap.clear();
    for (const lanePoint of this.lanePoints) {
      this.lanePointMap.set(lanePoint.guid, lanePoint);
    }
    console.log("lanePointMap を更新しました");
  }

  addLanePoint(value: LanePoint) {
    this.lanePoints.push(value);
    this.updateLanePointMap();
  }

  clearLanePoints() {
    this.mutable.lanePoints = [];
    this.updateLanePointMap();
  }

  /**
   * レーン
   */
  laneMap = new Map<string, Lane>();

  updateLaneMap() {
    console.log(this);
    this.laneMap.clear();
    for (const lane of this.lanes) {
      this.laneMap.set(lane.guid, lane);
    }
    console.log("LaneMap を更新しました", this.laneMap);

    this.calculateTime();
  }

  @action
  setLanes(lanes: Lane[]) {
    this.mutable.lanes = lanes;
    this.updateLaneMap();
  }

  @action
  addLane(lane: Lane) {
    this.lanes.push(lane);
    this.updateLaneMap();
  }

  @action
  clearLanes() {
    this.mutable.lanes = [];
    this.laneMap.clear();
  }

  /**
   * ノートラインを最適化する
   */
  @action
  optimizeNoteLine() {
    for (const noteLine of this.noteLines) {
      // 先頭と末尾をソートして正しい順序にする
      const [head, tail] = [
        this.noteMap.get(noteLine.head)!,
        this.noteMap.get(noteLine.tail)!
      ].sort(sortMeasure);

      noteLine.head = head.guid;
      noteLine.tail = tail.guid;
    }
  }

  /**
   * 最適化する
   */
  @action
  optimise() {
    this.optimiseLane();
    this.optimizeNoteLine();
  }

  /**
   * レーンを最適化する
   */
  @action
  optimiseLane() {
    // レーンポイントをソートする
    for (const lane of this.lanes) {
      lane.points = lane.points.slice().sort((a, b) => {
        const lp1 = this.lanePoints.find(lp => lp.guid === a)!;
        const lp2 = this.lanePoints.find(lp => lp.guid === b)!;

        const p1 = lp1.measureIndex + Fraction.to01(lp1.measurePosition);
        const p2 = lp2.measureIndex + Fraction.to01(lp2.measurePosition);

        return p1 - p2;
      });
    }

    while (1) {
      let f = false;

      for (const lane of this.lanes) {
        const lastLanePoint = lane.points[lane.points.length - 1];

        // 後方に結合するレーン
        const nextLane = this.lanes.find(lane2 => {
          if (lane === lane2) return false;

          return lane2.points[0] === lastLanePoint;
        });

        if (nextLane) {
          // 古いレーンを参照していたノートのレーン情報を更新
          for (const note of this.notes.filter(
            note => note.lane === nextLane.guid
          )) {
            note.lane = lane.guid;
          }

          const nextLaneIndex = this.lanes.findIndex(l => l === nextLane);
          lane.points.push(...nextLane.points.slice(1));

          this.setLanes(
            this.lanes.filter((l, index) => index !== nextLaneIndex)
          );
          f = true;
          break;
        }
      }

      if (!f) break;
    }
  }

  /**
   * BPM変更オブジェクトを取得する
   */
  public get bpmChanges() {
    return this.otherObjects.filter(object => object.isBPM());
  }
}
