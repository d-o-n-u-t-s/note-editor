import { Record } from "immutable";
import { Vector2 } from "../math";
import { GUID } from "../util";
import { Mutable } from "../utils/mutable";
import { Measure } from "./Measure";

export type LaneData = {
  guid: GUID;

  points: GUID[];

  templateName: string;

  /**
   * 分割数
   */
  division: number;
};

const defaultLaneData: LaneData = {
  guid: "GUID",
  points: [],
  templateName: "",
  division: 0
};

export type Lane = Mutable<LaneRecord>;

export class LaneRecord extends Record<LaneData>(defaultLaneData) {
  static new(data: LaneData): Lane {
    const lane = new LaneRecord(data);
    return Object.assign(lane, lane.asMutable());
  }

  private constructor(data: LaneData) {
    super(data);
  }

  get data(): Lane {
    return this;
  }
}

export interface LinePointInfo {
  point: Vector2;
  width: number;
}

export interface LineInfo {
  measure: Measure;
  start: LinePointInfo;
  end: LinePointInfo;
}
