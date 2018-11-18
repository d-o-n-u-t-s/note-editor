import { LinePointInfo, LineInfo } from "../objects/Lane";
import Vector2 from "../math/Vector2";
import { Measure } from "../objects/Measure";

class Pool<T> {
  index = 0;
  objects: T[] = [];
  isFull = () => this.index === this.objects.length;
  get = () => this.objects[this.index++];
  add = (obj: T) => {
    this.objects.push(obj);
    return this.get();
  };
}

const linePointInfoPool = new Pool<LinePointInfo>();
export function GetLinePointInfoFromPool(x: number, y: number, width: number) {
  if (linePointInfoPool.isFull()) {
    return linePointInfoPool.add({ point: new Vector2(x, y), width });
  }
  const obj = linePointInfoPool.get();
  obj.point.x = x;
  obj.point.y = y;
  obj.width = width;
  return obj;
}

const lineInfoPool = new Pool<LineInfo>();
export function GetLineInfoFromPool(
  measure: Measure,
  start: LinePointInfo,
  end: LinePointInfo
) {
  if (lineInfoPool.isFull()) {
    return lineInfoPool.add({ measure, start, end });
  }
  const obj = lineInfoPool.get();
  obj.measure = measure;
  obj.start = start;
  obj.end = end;
  return obj;
}

export function resetAll() {
  lineInfoPool.index = 0;
  linePointInfoPool.index = 0;
}
