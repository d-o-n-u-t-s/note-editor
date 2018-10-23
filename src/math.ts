import * as math from "mathjs";

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
