import Vector2 from "../math/Vector2";

export interface Line {
  start: Vector2;
  end: Vector2;
}
function line_intersect(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  x4: number,
  y4: number
) {
  // Check if none of the lines are of length 0
  if ((x1 === x2 && y1 === y2) || (x3 === x4 && y3 === y4)) {
    return false;
  }

  var denominator = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);

  // Lines are parallel
  if (denominator === 0) {
    return false;
  }

  let ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denominator;
  let ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denominator;

  // is the intersection along the segments
  if (ua < 0 || ua > 1 || ub < 0 || ub > 1) {
    return false;
  }

  // Return a object with the x and y coordinates of the intersection
  let x = x1 + ua * (x2 - x1);
  let y = y1 + ua * (y2 - y1);

  return { x, y };
}

export function lineIntersect(point1: Line, point2: Line) {
  if (!point1 || !point2) {
    console.error("point...", point1, point2);
  }

  const add = Vector2.sub(point1.end, point1.start)
    .normalize()
    .multiplyScalar(4);

  point1.start.x -= add.x;
  point1.start.y -= add.y;

  point1.end.x += add.x;
  point1.end.y += add.y;

  // drawLine(point1, 2, 0x00ff00);
  // drawLine(point2, 2, 0x00ffff);

  const nn = line_intersect(
    point1.start.x,
    point1.start.y,
    point1.end.x,
    point1.end.y,
    point2.start.x,
    point2.start.y,
    point2.end.x,
    point2.end.y
  );

  if (!nn) return false;

  return new Vector2(nn!.x, nn!.y);
}
