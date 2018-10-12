import Lane from "./Lane";
import LanePoint from "./LanePoint";
import BPMChange from "./BPMChange";
import SpeedChange from "./SpeedChange";
import INote from "./Note";
import NoteLine from "./NoteLine";
import { observable, observe, action, computed, IObservableArray } from "mobx";
import { sortMeasure } from "./Measure";

export default class Timeline {
  constructor() {
    observe(this.notes, () => {
      this.noteMap.clear();

      for (const note of this.notes) {
        this.noteMap.set(note.guid, note);
      }

      console.log("NoteMap を更新しました");
    });

    observe(this.lanes, () => {
      console.warn("lane が更新されました", this.lanes);

      this.laneMap.clear();
      for (const lane of this.lanes) {
        this.laneMap.set(lane.guid, lane);
      }
      console.log("LaneMap を更新しました");
    });

    observe(this.lanePoints, () => {
      this.lanePointMap.clear();
      for (const lanePoint of this.lanePoints) {
        this.lanePointMap.set(lanePoint.guid, lanePoint);
      }
      console.log("lanePointMap を更新しました");
    });
  }

  /**
   * 水平レーン分割数
   */
  @observable
  horizontalLaneDivision: number = 16;

  @observable
  bpmChanges: IObservableArray<BPMChange> = observable([]);

  @action
  addBPMChange(value: BPMChange) {
    this.bpmChanges.push(value);
  }

  @action
  removeBpmChange(bpmChange: BPMChange) {
    this.bpmChanges.remove(bpmChange);
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
  notes: IObservableArray<INote> = observable([]);

  noteMap = new Map<string, INote>();

  @observable
  noteLines: IObservableArray<NoteLine> = observable([]);

  @action
  addNote = (note: INote) => this.notes.push(note);

  @action
  removeNote(note: INote) {
    // ノートを参照しているノートラインを削除する
    for (const noteLine of this.noteLines.filter(
      noteLine => noteLine.head === note.guid || noteLine.tail === note.guid
    )) {
      this.removeNoteLine(noteLine);
    }

    this.notes.remove(note);
  }

  @action
  removeNoteLine(noteLine: NoteLine) {
    this.noteLines.remove(noteLine);
  }

  @action
  addNotes = (notes: INote[]) => this.notes.push(...notes);

  @action
  addNoteLine = (noteLine: NoteLine) => this.noteLines.push(noteLine);

  @action
  addLanePoint = (value: LanePoint) => this.lanePoints.push(value);

  @observable
  tempos: { laneIndex: number; tempo: number }[] = [];

  @action
  setTempos(tempos: { laneIndex: number; tempo: number }[]) {
    this.tempos = tempos;
  }

  /**
   * レーン
   */
  lanes: IObservableArray<Lane> = observable([]);

  laneMap = new Map<string, Lane>();

  @action
  setLanes = (lanes: Lane[]) => {
    this.lanes.replace(lanes); // = lanes);
  };

  @action
  addLane = (lane: Lane) => this.lanes.push(lane);

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

        const p1 = lp1.measureIndex + lp1.measurePosition.to01Number();
        const p2 = lp2.measureIndex + lp2.measurePosition.to01Number();

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
}
