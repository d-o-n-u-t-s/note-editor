import * as math from "mathjs";
import * as _ from "lodash";

export interface IFraction {
  numerator: number;
  denominator: number;
}

export class Fraction {
  constructor(public numerator: number, public denominator: number) {}

  static to01(fraction: IFraction) {
    return (1 / fraction.denominator) * fraction.numerator;
  }

  static clone(fraction: IFraction) {
    return {
      numerator: fraction.numerator,
      denominator: fraction.denominator
    };
  }
  static equal(a: IFraction, b: IFraction) {
    return a.denominator === b.denominator && a.numerator === b.numerator;
  }

  static none = new Fraction(0, 0);

  to01Number = () => (1 / this.denominator) * this.numerator;

  toMathjs = () => math.fraction(this.numerator, this.denominator);

  clone() {
    return new Fraction(this.numerator, this.denominator);
  }

  toString() {
    return this.numerator + "/" + this.denominator;
  }
}

export { default as Vector2 } from "./math/Vector2";

export const lerp = (from: number, to: number, t: number) =>
  from + (to - from) * t;

export const inverseLerp = (from: number, to: number, value: number) =>
  (value - from) / (to - from);

/**
 * 数値を検査して正常な値にする
 * @param value 値
 * @param min 最小値
 * @param max 最大値
 */
export function verifyNumber(value: number, min = -Infinity, max = Infinity) {
  return _.clamp(Number.isFinite(value) ? value : 0, min, max);
}
