import { Fraction } from "../math";
import TimelineObject from "./TimelineObject";
import { GUID, guid } from "../util";
import Lane from "./Lane";
import { sortQuadPoint, sortQuadPointFromQuad } from "../utils/drawQuad";
import Measure from "./Measure";

class Note {}

export default interface INote extends TimelineObject {
  horizontalSize: number;
  horizontalPosition: Fraction;

  type: string;

  color: number; // = 0xffffff;

  /**
   * 所属レーンの GUID
   */
  lane: GUID;

  /**
   * 接続可能ノートか
   */
  connectable: boolean;

  customProperties: any;
}
