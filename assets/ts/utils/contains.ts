import { Vector2 } from "../math";

/*
  a--b
  |  |
  d--c
*/
export function containsQuad(
  point: Vector2,
  a: Vector2,
  b: Vector2,
  c: Vector2,
  d: Vector2
): boolean {
  return containsTriangle(point, a, c, b) || containsTriangle(point, a, d, c);
}

export function containsTriangle(
  point: Vector2,
  a: Vector2,
  b: Vector2,
  c: Vector2
): boolean {
  // マウスカーソル位置
  //var p = createVector(mouseX - width / 2, mouseY - height / 2);

  const _p = point,
    _a = a,
    _b = b,
    _c = c;

  //     a
  //    / \
  //   /   \
  //  b --- c
  //
  var ab = Vector2.sub(_b, _a);
  var ap = Vector2.sub(_p, _a);

  var bc = Vector2.sub(_c, _b);
  var bp = Vector2.sub(_p, _b);

  var ca = Vector2.sub(_a, _c);
  var cp = Vector2.sub(_p, _c);

  // 外積
  var z1 = ab.x * ap.y - ab.y * ap.x;
  var z2 = bc.x * bp.y - bc.y * bp.x;
  var z3 = ca.x * cp.y - ca.y * cp.x;

  return (z1 > 0 && z2 > 0 && z3 > 0) || (z1 < 0 && z2 < 0 && z3 < 0);
}
