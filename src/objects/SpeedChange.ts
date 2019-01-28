import { Record } from "immutable";
import Pixi from "../containers/Pixi";
import { Fraction } from "../math";
import { GUID } from "../utils/guid";
import { Mutable } from "../utils/mutable";
import { Measure } from "./Measure";

export type SpeedChangeData = {
  speed: number;
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

const defaultSpeedChangeData: SpeedChangeData = {
  guid: "",
  measureIndex: 0,
  measurePosition: Fraction.none,
  speed: 1
};

export type SpeedChange = Mutable<SpeedChangeRecord>;

export class SpeedChangeRecord extends Record<SpeedChangeData>(
  defaultSpeedChangeData
) {
  static new(data: SpeedChangeData): SpeedChange {
    const speedChange = new SpeedChangeRecord(data);
    return Object.assign(speedChange, speedChange.asMutable());
  }

  private constructor(data: SpeedChangeData) {
    super(data);
  }
}

class _SpeedRenderer {
  getBounds(speedChange: SpeedChange, measure: Measure): PIXI.Rectangle {
    const lane = measure;

    const y =
      lane.y +
      lane.height -
      (lane.height / speedChange.measurePosition!.denominator) *
        speedChange.measurePosition!.numerator;

    const colliderH = 20;

    // this.width = w;
    //this.height = colliderH;
    const _x = measure.x;
    const _y = y - colliderH / 2;

    return new PIXI.Rectangle(_x, _y, measure.width, colliderH);
  }

  render(speed: SpeedChange, graphics: PIXI.Graphics, measure: Measure) {
    const bounds = this.getBounds(speed, measure);

    graphics
      .lineStyle(0)
      .beginFill(0xff0000)
      .drawRect(bounds.x, bounds.y, bounds.width, bounds.height)
      .endFill();

    Pixi.instance!.drawText(
      `speed: ${speed.speed}`,
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
      {},
      measure.width
    );
  }
}

export const SpeedRenderer = new _SpeedRenderer();
