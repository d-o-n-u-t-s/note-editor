import { Fraction } from "../math";
import TimelineObject from "./TimelineObject";
import { GUID } from "../util";

export default interface INote extends TimelineObject {
  horizontalSize: number;
  horizontalPosition: Fraction;

  x: number;
  y: number;
  width: number;
  height: number;

  type: string;

  isVisible: boolean;

  /**
   * 所属レーンの GUID
   */
  lane: GUID;

  editorProps: {
    color: number;
    sePlayed: boolean;
  };

  customProps: any;
}
