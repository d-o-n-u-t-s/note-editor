import { Fraction } from "../math";
import TimelineObject from "./TimelineObject";
import { Mutable } from "../utils/mutable";
import { Record } from "immutable";

/**
 * レーンの中間点
 */
export type LanePointData = {
  horizontalSize: number;
  horizontalPosition: Fraction;

  templateName: string;

  color: number; // = 0xffffff;
} & TimelineObject;

const defaultNoteLineData: LanePointData = {
  guid: "GUID",
  horizontalSize: 0,
  horizontalPosition: Fraction.none,
  templateName: "?",
  measureIndex: 0,
  measurePosition: Fraction.none,
  color: 0xffffff
};

export type LanePoint = Mutable<LanePointRecord>;

export class LanePointRecord extends Record<LanePointData>(
  defaultNoteLineData
) {
  static new(data: LanePointData): LanePoint {
    return new LanePointRecord(data).asMutable();
  }

  private constructor(data: LanePointData) {
    super(data);
  }
}
