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

  static add(a: Vector2, b: Vector2) {
    return new Vector2(a.x + b.x, a.y + b.y);
  }

  public static sub(a: Vector2, b: Vector2) {
    return new Vector2(a.x - b.x, a.y - b.y);
  }
}

export default Vector2;
