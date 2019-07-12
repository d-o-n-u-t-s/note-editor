import { Record } from "immutable";
import Pixi from "../containers/Pixi";
import { Fraction } from "../math";
import { GUID } from "../utils/guid";
import { Mutable } from "../utils/mutable";
import { Measure } from "./Measure";

export enum OtherObjectType {
  BPM = 1,
  Speed,
  Skill
}

export type OtherObjectData = {
  type: OtherObjectType;
  value: number;
  guid: GUID;

  /**
   * 小節インデックス
   */
  measureIndex: number;
  /**
   * 小節内の位置
   */
  measurePosition: Fraction;
};

const defaultOtherObjectData: OtherObjectData = {
  type: 0,
  guid: "",
  measureIndex: 0,
  measurePosition: Fraction.none,
  value: 1
};

export type OtherObject = Mutable<OtherObjectRecord>;

export class OtherObjectRecord extends Record<OtherObjectData>(
  defaultOtherObjectData
) {
  static new(data: OtherObjectData): OtherObject {
    const speedChange = new OtherObjectRecord(data);
    return Object.assign(speedChange, speedChange.asMutable());
  }

  private constructor(data: OtherObjectData) {
    super(data);
  }

  isBPM() {
    return this.type == OtherObjectType.BPM;
  }
}

class _OtherObjectRenderer {
  private colors = [null, 0xff0000, 0x00ff00, 0xff00ff];
  private labels = [null, "bpm", "speed", "skill"];

  getBounds(otherObject: OtherObject, measure: Measure): PIXI.Rectangle {
    const lane = measure;

    const y =
      lane.y +
      lane.height -
      (lane.height / otherObject.measurePosition!.denominator) *
        otherObject.measurePosition!.numerator;

    const colliderH = 10;
    const _x = measure.x + (measure.width / 3) * (otherObject.type - 1);
    const _y = y - colliderH / 2;

    return new PIXI.Rectangle(_x, _y, measure.width / 3, colliderH);
  }

  render(object: OtherObject, graphics: PIXI.Graphics, measure: Measure) {
    const bounds = this.getBounds(object, measure);

    graphics
      .lineStyle(0)
      .beginFill(this.colors[object.type]!, 0.5)
      .drawRect(measure.x, bounds.y, measure.width, bounds.height)
      .endFill();

    Pixi.instance!.drawText(
      `${this.labels[object.type]}: ${object.value}`,
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
      {},
      measure.width
    );
  }
}

export const OtherObjectRenderer = new _OtherObjectRenderer();
