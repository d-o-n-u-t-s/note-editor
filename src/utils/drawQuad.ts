import * as PIXI from "pixi.js";
import Vector2 from "../math/Vector2";

/**
 * 4 頂点を
 * a--b
 * |  |
 * d--c
 * の配置にソートする
 * @param p1
 * @param p2
 * @param p3
 * @param p4
 */
export function sortQuadPoint(
  p1: Vector2,
  p2: Vector2,
  p3: Vector2,
  p4: Vector2
) {
  const [a, b, c, d] = [p1, p2, p3, p4].sort((a, b) => a.y - b.y);

  // 左上, 右上
  const [pp1, pp2] = [a, b].sort((a, b) => b.x - a.x);
  // 左下, 右下
  const [pp3, pp4] = [c, d].sort((a, b) => b.x - a.x);

  return [pp1, pp2, pp4, pp3];
}

export function drawQuad(
  graphics: PIXI.Graphics,
  p1: Vector2,
  p2: Vector2,
  p3: Vector2,
  p4: Vector2,
  color: number,
  alpha: number = 0.3
) {
  const [pp1, pp2, pp3, pp4] = sortQuadPoint(p1, p2, p3, p4);

  graphics.lineStyle(0);
  graphics.beginFill(color, alpha);

  const margin = 0;

  graphics.drawPolygon([
    pp1.x + margin,
    pp1.y + margin,
    pp2.x - margin,
    pp2.y + margin,
    pp3.x - margin,
    pp3.y - margin,
    pp4.x + margin,
    pp4.y - margin,
  ]);
  graphics.endFill();
}

export function drawTriangle(
  graphics: PIXI.Graphics,
  p1: Vector2,
  p2: Vector2,
  p3: Vector2,
  color: number,
  alpha: number = 1
) {
  const [pp1, pp2, pp3] = [p1, p2, p3];

  graphics.lineStyle(0);
  graphics.beginFill(color, alpha);

  const margin = 0;

  graphics.drawPolygon([
    pp1.x + margin,
    pp1.y + margin,
    pp2.x - margin,
    pp2.y + margin,
    pp3.x - margin,
    pp3.y - margin,
  ]);
  graphics.endFill();
}
