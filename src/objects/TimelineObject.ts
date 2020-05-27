import { Fraction } from "../math";
import { GUID, guid } from "../utils/guid";

export type TimelineObjectType = {
  guid: GUID;
  measureIndex: number;
  measurePosition: Fraction;
};

export default class TimelineObject implements TimelineObjectType {
  guid: GUID = guid();

  /**
   * 小節インデックス
   */
  measureIndex: number = 0;
  /**
   * 小節内の位置
   */
  measurePosition: Fraction = Fraction.none;
}
