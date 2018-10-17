import * as _ from "lodash";
import { Fraction, IFraction } from "../math";
import Pixi from "../Pixi";

export interface IMeasureData {
  index: number;
  beat: IFraction;
  customProps: any;
}

class GraphicObject {
  x = 0;
  y = 0;
  width = 0;
  height = 0;
}

/**
 * 小節内の位置
 */
interface MeasurePoint {
  x: number;
}

/**
 * 小節
 */
export default class Measure extends GraphicObject {
  isVisible = false;

  x = 0;
  y = 0;
  width = 0;
  height = 0;

  containsPoint(point: { x: number; y: number }) {
    return (
      _.inRange(point.x, this.x, this.x + this.width) &&
      _.inRange(point.y, this.y, this.y + this.height)
    );
  }

  getBounds() {
    return new PIXI.Rectangle(
      this.x + Pixi.debugGraphics!.x,

      this.y,
      this.width,
      this.height
    );
  }

  constructor(public data: IMeasureData) {
    super();
  }
}

interface MeasureObject {
  measureIndex: number;
  measurePosition: Fraction;
}

export function sortMeasure(a: MeasureObject, b: MeasureObject) {
  const v1 = a.measureIndex + a.measurePosition.to01Number();
  const v2 = b.measureIndex + b.measurePosition.to01Number();

  return v1 - v2;
}
