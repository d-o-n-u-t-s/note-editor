import { lerp } from "../math";

class Vector2 {
  constructor(public x: number, public y: number) {}

  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  normalize() {
    return this.divideScalar(this.length() || 1);
  }

  multiplyScalar(scalar: number) {
    this.x *= scalar;
    this.y *= scalar;

    return this;
  }

  divideScalar(scalar: number) {
    return this.multiplyScalar(1 / scalar);
  }

  distanceTo(v: Vector2) {
    return Math.sqrt(this.distanceToSquared(v));
  }

  distanceToSquared(v: Vector2) {
    const dx = this.x - v.x,
      dy = this.y - v.y;
    return dx * dx + dy * dy;
  }

  static add(a: Vector2, b: Vector2) {
    return new Vector2(a.x + b.x, a.y + b.y);
  }

  static sub(a: Vector2, b: Vector2) {
    return new Vector2(a.x - b.x, a.y - b.y);
  }

  static lerp(a: Vector2, b: Vector2, t: number) {
    return new Vector2(lerp(a.x, b.x, t), lerp(a.y, b.y, t));
  }
}

export default Vector2;
