import { Record } from "immutable";
import * as PIXI from "pixi.js";
import Pixi from "../containers/Pixi";
import { Fraction } from "../math";
import { OtherObjectType } from "../stores/MusicGameSystem";
import { GUID } from "../utils/guid";
import { Mutable } from "../utils/mutable";
import { Measure } from "./Measure";
import TimelineObjectType from "./TimelineObject";

export type OtherObjectData = TimelineObjectType & {
  type: number;
  value: number;
};

const defaultOtherObjectData: OtherObjectData = {
  type: 0,
  guid: "",
  measureIndex: 0,
  measurePosition: Fraction.none,
  value: 1,
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

  /**
   * 小節位置を取得する
   */
  public getMeasurePosition() {
    return this.measureIndex + Fraction.to01(this.measurePosition);
  }

  /**
   * BPMオブジェクトか
   */
  public isBPM() {
    return this.type == 0;
  }

  /**
   * 速度変更オブジェクトか
   */
  public isSpeed() {
    return this.type == 1;
  }

  /**
   * 停止オブジェクトか
   */
  public isStop() {
    return this.type == 2;
  }
}

class _OtherObjectRenderer {
  getBounds(
    otherObjectTypes: OtherObjectType[],
    otherObject: OtherObject,
    measure: Measure
  ): PIXI.Rectangle {
    const lane = measure;

    const y =
      lane.y +
      lane.height -
      (lane.height / otherObject.measurePosition!.denominator) *
        otherObject.measurePosition!.numerator;

    const colliderW = measure.width / otherObjectTypes.length;
    const colliderH = 10;
    const _x = measure.x + colliderW * otherObject.type;
    const _y = y - colliderH / 2;

    return new PIXI.Rectangle(_x, _y, colliderW, colliderH);
  }

  render(
    otherObjectTypes: OtherObjectType[],
    object: OtherObject,
    graphics: PIXI.Graphics,
    measure: Measure
  ) {
    const bounds = this.getBounds(otherObjectTypes, object, measure);

    graphics
      .lineStyle(0)
      .beginFill(Number(otherObjectTypes[object.type].color), 0.5)
      .drawRect(measure.x, bounds.y, measure.width, bounds.height)
      .endFill();

    Pixi.instance!.drawText(
      `${otherObjectTypes[object.type].name}: ${object.value}`,
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
      {},
      measure.width
    );
  }
}

export const OtherObjectRenderer = new _OtherObjectRenderer();
