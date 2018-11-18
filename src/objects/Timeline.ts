import { fromJS, Record } from "immutable";
import * as immutablediff from "immutablediff";
import { action, IObservableArray, observable } from "mobx";
import { Mutable } from "src/utils/mutable";
import { Fraction } from "../math";
import Chart from "../stores/Chart";
import {
  BpmChange,
  BpmChangeData,
  BpmChangeRecord,
  TimeCalculator
} from "./BPMChange";
import { Lane, LaneData, LaneRecord } from "./Lane";
import { LanePoint, LanePointData, LanePointRecord } from "./LanePoint";
import { Measure, MeasureData, MeasureRecord, sortMeasure } from "./Measure";
import { Note, NoteData, NoteRecord } from "./Note";
import { NoteLine, NoteLineData, NoteLineRecord } from "./NoteLine";
import SpeedChange from "./SpeedChange";

export type TimelineJsonData = {
  notes: NoteData[];
  noteLines: NoteLineData[];
  measures: MeasureData[];
  lanePoints: LanePointData[];
  bpmChanges: BpmChangeData[];
  lanes: LaneData[];
};

export type TimelineData = {
  notes: Note[];
  noteLines: NoteLine[];
  measures: Measure[];
  lanes: Lane[];
  lanePoints: LanePoint[];
  bpmChanges: BpmChange[];
};

const defaultTimelineData: TimelineData = {
  notes: [],
  noteLines: [],
  measures: [],
  lanes: [],
  lanePoints: [],
  bpmChanges: []
};

export type Timeline = Mutable<TimelineRecord>;

export class TimelineRecord extends Record<TimelineData>(defaultTimelineData) {
  static new(chart: Chart, data?: TimelineData): Timeline {
    let timeline = new TimelineRecord(chart, data);
    timeline = Object.assign(timeline, timeline.asMutable());

    // 各 Record を mutable に変換する
    timeline.mutable.notes = timeline.notes.map(note =>
      NoteRecord.new(note, chart)
    );
    timeline.mutable.noteLines = timeline.noteLines.map(noteLine =>
      NoteLineRecord.new(noteLine)
    );
    timeline.mutable.measures = timeline.measures.map(measure =>
      MeasureRecord.new(measure)
    );
    timeline.mutable.lanes = timeline.lanes.map(lane => LaneRecord.new(lane));
    timeline.mutable.lanePoints = timeline.lanePoints.map(lanePoint =>
      LanePointRecord.new(lanePoint)
    );
    timeline.mutable.bpmChanges = timeline.bpmChanges.map(bpmChange =>
      BpmChangeRecord.new(bpmChange)
    );

    timeline.updateNoteMap();
    timeline.updateLanePointMap();
    timeline.updateLaneMap();

    return timeline;
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
      [...this.bpmChanges].sort(sortMeasure),
      this.measures
    );

    for (const note of this.notes) {
      // 判定時間を更新する
      note.data.editorProps.time = this.timeCalculator.getTime(
        note.data.measureIndex + Fraction.to01(note.data.measurePosition)
      );
    }

    console.info("判定時間を更新しました");
  }

  /**
   * 水平レーン分割数
   */
  @observable
  horizontalLaneDivision: number = 16;

  @action
  addBPMChange(value: BpmChange) {
    this.bpmChanges.push(value);
    this.calculateTime();
    this.save();
  }

  @action
  removeBpmChange(bpmChange: BpmChange) {
    this.mutable.bpmChanges = this.bpmChanges.filter(bc => bc !== bpmChange);
    this.calculateTime();
    this.save();
  }

  @action
  setMeasures(measures: Measure[]) {
    this.mutable.measures = measures;
  }

  /**
   * 速度変更
   */
  @observable
  speedChanges: IObservableArray<SpeedChange> = observable([]);

  @action
  addSpeedChange(speedChange: SpeedChange) {
    this.speedChanges.push(speedChange);
  }

  @action
  removeSpeedChange(speedChange: SpeedChange) {
    this.speedChanges.remove(speedChange);
  }

  history: any[] = [];

  historyIndex = 0;

  @action
  save() {
    // 初回
    if (!this.history[0]) {
      this.history.push(
        immutablediff(
          {},
          {
            notes: this.notes,
            noteLines: this.noteLines
          }
        )
      );
    }

    console.log("save", this.history);

    var p = fromJS({
      notes: [],
      noteLines: []
    });

    for (var i = 0; i < this.historyIndex + 1; i++) {
      console.log(i, p, this.history);

      p = require("immutablepatch")(p, this.history[i]);
    }

    // 前回保存したときの notes
    const prevSavedNotes = p;

    this.history = this.history.slice(0, this.historyIndex + 1);

    this.history.push(
      immutablediff(
        p,
        fromJS({
          notes: this.notes,
          noteLines: this.noteLines
        })
      )
    );

    this.historyIndex++;

    this.undoable = true;
  }

  @observable
  undoable = false;

  @observable
  redoable = false;

  private get mutable() {
    return this as Mutable<TimelineRecord>;
  }

  @action
  undo() {
    if (this.historyIndex <= 0) {
      console.error("だめ");
      return;
    }

    this.historyIndex--;

    var p = {
      notes: [],
      noteLines: []
    };

    for (var i = 0; i < this.historyIndex + 1; i++) {
      p = require("immutablepatch")(p, this.history[i]);
    }

    p = (p as any).toJS();

    this.mutable.notes = p.notes.map(note => NoteRecord.new(note, this.chart!));
    this.mutable.noteLines = p.noteLines.map(note => NoteLineRecord.new(note));

    console.log("undo", p);

    if (this.historyIndex <= 0) {
      this.undoable = false;
    }
  }

  redo() {
    console.log("redo");

    this.historyIndex++;

    var p: any[] = [];

    for (var i = 0; i < this.historyIndex + 1; i++) {
      p = require("immutablepatch")(p, this.history[i]);
    }

    (this.notes as any) = p;
  }

  /**
   * notes 変更
   */
  updateNoteMap() {
    this.noteMap.clear();

    for (const note of this.notes) {
      this.noteMap.set(note.data.guid, note);
    }
    console.log("NoteMap を更新しました");

    this.calculateTime();
  }

  noteMap = new Map<string, Note>();

  private chart: Chart | null = null;

  $initializeNotes(notes: NoteData[], chart: Chart) {
    this.chart = chart;
    for (const noteData of notes) {
      this.notes.push(NoteRecord.new(noteData, chart));
    }
    this.updateNoteMap();
  }

  $initializeNoteLines(noteLines: NoteLineData[], chart: Chart) {
    this.mutable.noteLines = noteLines.map(noteLine =>
      NoteLineRecord.new(noteLine)
    );
  }

  $initializeLanes(lanes: LaneData[]) {
    this.mutable.lanes = lanes.map(lane => LaneRecord.new(lane));
    this.updateLaneMap();
  }

  addNote(note: Note) {
    this.notes.push(note);
    this.updateNoteMap();
    this.save();
  }

  removeNote(note: Note) {
    // ノートを参照しているノートラインを削除する
    for (const noteLine of this.noteLines.filter(
      noteLine =>
        noteLine.head === note.data.guid || noteLine.tail === note.data.guid
    )) {
      this.removeNoteLine(noteLine);
    }

    (this as Mutable<TimelineRecord>).notes = this.notes.filter(
      _note => _note != note
    );

    this.updateNoteMap();
    this.save();
  }

  addNoteLine(noteLine: NoteLine) {
    this.noteLines.push(noteLine);
    this.save();
  }

  removeNoteLine(noteLine: NoteLine) {
    this.mutable.noteLines = this.noteLines.filter(_note => _note != noteLine);
    this.save();
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
        this.noteMap.get(noteLine.head)!.data,
        this.noteMap.get(noteLine.tail)!.data
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
            note => note.data.lane === nextLane.guid
          )) {
            note.data.set("lane", lane.guid);
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
}
