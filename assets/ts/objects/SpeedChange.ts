import TimelineObject from "./TimelineObject";

import { GUID } from "../util";
import { Fraction } from "../math";
import Pixi from "../Pixi";
import Measure from "./Measure";

enum Types {
  Integer,
  Float,
  Boolean,
  Fraction
}

interface IChronoObject {
  guid: GUID;

  /**
   * 小節インデックス
   */
  measureIndex: number;
  /**
   * 小節内の位置
   */
  measurePosition: Fraction;
}

export default interface SpeedChange extends IChronoObject {
  speed: number;
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

    Pixi.instance!.drawTempText(
      `speed: ${speed.speed}`,
      bounds.x + bounds.width / 6,
      bounds.y + bounds.height / 2
    );
  }
}

export const SpeedRenderer = new _SpeedRenderer();
