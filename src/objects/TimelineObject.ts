import { Fraction } from "../math";
import { GUID, guid } from "../utils/guid";

export default class TimelineObject {
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
