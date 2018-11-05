import * as _ from "lodash";
import { action, IObservableArray, observable, observe } from "mobx";
import { Fraction } from "../math";
import IBPMChange, { TimeCalculator } from "./BPMChange";
import Lane from "./Lane";
import LanePoint from "./LanePoint";
import Measure, { sortMeasure } from "./Measure";
import Note from "./Note";
import NoteLine from "./NoteLine";
import SpeedChange from "./SpeedChange";
import { fromJS, List } from "immutable";
import Chart from "../stores/Chart";

export default class Timeline {
  constructor() {
    observe(this.changed_lanes, () => {
      this.laneMap.clear();
      for (const lane of this.lanes) {
        this.laneMap.set(lane.guid, lane);
      }
      console.log("LaneMap を更新しました", this.changed_lanes.count);

      this.calculateTime();
    });

    observe(this.bpmChanges, () => {
      console.log("bpm が変更");

      this.calculateTime();
    });

    observe(this.lanePoints, () => {
      this.lanePointMap.clear();
      for (const lanePoint of this.lanePoints) {
        this.lanePointMap.set(lanePoint.guid, lanePoint);
      }
      console.log("lanePointMap を更新しました");
    });
  }

  timeCalculator = new TimeCalculator([], []);

  /**
   * 判定時間を更新する
   */
  @action
  calculateTime() {
    this.timeCalculator = new TimeCalculator(
      this.bpmChanges.slice().sort(sortMeasure),
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

  @observable
  bpmChanges: IObservableArray<IBPMChange> = observable([]);

  @action
  addBPMChange(value: IBPMChange) {
    this.bpmChanges.push(value);
  }

  @action
  removeBpmChange(bpmChange: IBPMChange) {
    this.bpmChanges.remove(bpmChange);
  }

  measures: Measure[] = [];

  /**
   * measures 変更通知
   */
  @observable
  private changed_measures = { count: 0 };

  /**
   * measures 変更
   */
  @action
  dirty_measures() {
    this.changed_measures.count++;
  }

  @action
  setMeasures(measures: Measure[]) {
    this.measures = measures;
    this.dirty_measures();
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

  @observable
  lanePoints: LanePoint[] = [];

  lanePointMap = new Map<string, LanePoint>();

  @observable
  noteLines: IObservableArray<NoteLine> = observable([]);

  /**
   * ノート
   */
  notes = List<Note>();

  history: any[] = [];

  historyIndex = 0;

  @action
  save() {
    console.log("save", this.history);

    var p: any[] = [];

    for (var i = 0; i < this.historyIndex + 1; i++) {
      p = require("immutablepatch")(p, this.history[i]);
    }

    // 前回保存したときの notes
    const prevSavedNotes = p;

    this.history = this.history.slice(0, this.historyIndex + 1);

    this.history.push(require("immutablediff")(p, this.notes));

    this.historyIndex++;

    this.undoable = true;
  }

  @observable
  undoable = false;

  @observable
  redoable = false;

  @action
  undo() {
    if (this.historyIndex <= 0) {
      console.error("だめ");
      return;
    }

    this.historyIndex--;

    var p: any[] = [];

    for (var i = 0; i < this.historyIndex + 1; i++) {
      p = require("immutablepatch")(p, this.history[i]);
    }

    (this.notes as any) = p;

    console.log("undo");

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

  @action
  addNote(note: Note) {
    this.notes = this.notes.push(note);
    this.updateNoteMap();
    this.save();
  }

  $initializeNotes(notes: any, chart: Chart) {
    for (const noteData of notes) {
      this.notes = this.notes.push(new Note(noteData, chart));
    }
    this.updateNoteMap();

    this.history.push(require("immutablediff")([], this.notes));
  }

  @action
  removeNote(note: Note) {
    // ノートを参照しているノートラインを削除する
    for (const noteLine of this.noteLines.filter(
      noteLine =>
        noteLine.head === note.data.guid || noteLine.tail === note.data.guid
    )) {
      this.removeNoteLine(noteLine);
    }

    _.remove(this.notes.toJS(), a => a === note);
    this.updateNoteMap();
  }

  @action
  removeNoteLine(noteLine: NoteLine) {
    this.noteLines.remove(noteLine);
  }

  @action
  addNoteLine = (noteLine: NoteLine) => this.noteLines.push(noteLine);

  @action
  addLanePoint = (value: LanePoint) => this.lanePoints.push(value);

  @action
  clearLanePoints() {
    this.lanePoints = [];
    this.lanePointMap.clear();
  }

  /**
   * レーン
   */
  lanes: Lane[] = [];

  /**
   * lanes 変更通知
   */
  @observable
  private changed_lanes = { count: 0 };

  /**
   * lanes 変更
   */
  @action
  dirty_lanes() {
    this.changed_lanes.count++;
  }

  laneMap = new Map<string, Lane>();

  @action
  setLanes = (lanes: Lane[]) => {
    this.lanes = lanes;
    this.dirty_lanes();
  };

  @action
  addLane(lane: Lane) {
    this.lanes.push(lane);
    this.dirty_lanes();
  }

  @action
  clearLanes() {
    this.lanes = [];
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
