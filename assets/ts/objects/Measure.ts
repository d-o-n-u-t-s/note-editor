import { Fraction } from "../math";

/**
 * 小節内の位置
 */
interface MeasurePoint {
  x: number;
}

/**
 * 小節
 */
export default class Measure extends PIXI.Sprite {
  constructor(public index: number, texture?: PIXI.Texture) {
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
