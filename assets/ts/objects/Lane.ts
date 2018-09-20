import TimelineObject from "./TimelineObject";
import LanePoint from "./LanePoint";
import Measure from "./Measure";

import { GUID } from "../util";

export default class Lane extends TimelineObject {
  points: GUID[] = [];

  templateName: string = "";

  /**
   * 分割数
   */
  division: number = 3;
}

import { Fraction, Vector2 } from "../math";

export interface LinePointInfo {
  point: Vector2;
  width: number;
}

export interface LineInfo {
  measure: Measure;
  start: LinePointInfo;
  end: LinePointInfo;
}
