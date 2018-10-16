import { Fraction } from "../math";
import TimelineObject from "./TimelineObject";
import { GUID } from "../util";

export default interface INote extends TimelineObject {
  horizontalSize: number;
  horizontalPosition: Fraction;

  type: string;

  /**
   * 所属レーンの GUID
   */
  lane: GUID;

  /**
   * 接続可能ノートか
   */
  connectable: boolean;

  editorProps: {
    color: number;
  };

  customProps: any;
}
