import { Vector2 } from "../math";
import { GUID } from "../util";
import { Measure } from "./Measure";

export default interface Lane {
  guid: GUID;

  points: GUID[];

  templateName: string;

  /**
   * 分割数
   */
  division: number; //= 3;
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
