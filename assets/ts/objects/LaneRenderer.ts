import TimelineObject from "./TimelineObject";
import LanePoint from "./LanePoint";
import Measure from "./Measure";
import { Fraction, Vector2, lerp, inverseLerp } from "../math";
import { GUID } from "../util";
import Lane, { LinePointInfo, LineInfo } from "./Lane";
import { Line, lineIntersect } from "../shapes/Line";

import { sortMeasure } from "../objects/Measure";

import Pixi from "../Pixi";

import { Quad } from "../shapes/Quad";
import { LaneTemplate } from "../stores/MusicGameSystem";
import { drawQuad } from "../utils/drawQuad";

interface LinePoint {
  measureIndex: number;
  measurePosition: Fraction;
  horizontalSize: number;
  horizontalPosition: Fraction;
}

interface QuadAndIndex extends Quad {
  horizontalIndex: number;
  verticalIndex: number;
}

export function getLines(points: LinePoint[], measures: Measure[]): LineInfo[] {
  performance.mark("getLines");

  const lines: LineInfo[] = [];

  const _points = points
    .slice()
    .sort(sortMeasure)
    .map(p => ({
      x: p.horizontalPosition.to01Number(),
      width: p.horizontalSize / p.horizontalPosition.denominator,
      value: p.measureIndex + p.measurePosition.to01Number()
    }));

  for (let i = 0; i < _points.length - 1; ++i) {
    const p1 = _points[i];
    const p2 = _points[i + 1];

    // 値を点に変換
    const toLinePointInfo = (measureIndex: number, value: number) => {
      const measure = measures[measureIndex];
      const p = inverseLerp(p1.value, p2.value, value);
      const width = lerp(p1.width, p2.width, p);
      return {
        point: new Vector2(
          measure.x + measure.width * (lerp(p1.x, p2.x, p) + width / 2),
          measure.y + measure.height * (measureIndex + 1 - value)
        ),
        width: measure.width * width
      };
    };

    let v1 = p1.value;
    let v2 = Math.min(Math.floor(v1) + 1, p2.value);
    while (true) {
      const m = Math.floor(v1);
      lines.push({
        measure: measures[m],
        start: toLinePointInfo(m, v1),
        end: toLinePointInfo(m, v2)
      });
      if (v2 === p2.value) {
        break;
      }
      v1 = v2;
      v2 = Math.min(v2 + 1, p2.value);
    }
  }

  performance.measure("getLines", "getLines");

  return lines;
}

const linesCache = new WeakMap<Lane, LineInfo[]>();

export interface ILaneRenderer {
  getNotePointInfo(
    lane: Lane,
    measure: Measure,
    horizontal: Fraction,
    vertical: Fraction
  ): LinePointInfo | null;
  render(
    lane: Lane,
    graphics: PIXI.Graphics,
    lanePointMap: Map<string, LanePoint>,
    measures: Measure[],
    drawHorizontalLineTargetMeasure?: Measure,
    md?: number
  ): QuadAndIndex[];

  defaultRender(
    graphics: PIXI.Graphics,
    lines: LineInfo[],
    laneTemplate: LaneTemplate
  ): void;
}

class LaneRenderer implements ILaneRenderer {
  defaultRender(
    graphics: PIXI.Graphics,
    lines: LineInfo[],
    laneTemplate: LaneTemplate
  ) {
    for (const line of lines) {
      drawQuad(
        graphics,
        Vector2.sub(line.start.point, new Vector2(line.start.width / 2, 0)),
        Vector2.add(line.start.point, new Vector2(line.start.width / 2, 0)),
        Vector2.add(line.end.point, new Vector2(line.end.width / 2, 0)),
        Vector2.sub(line.end.point, new Vector2(line.end.width / 2, 0)),
        Number(laneTemplate.color)
      );

      for (var i = 0; i < laneTemplate.division + 1; ++i) {
        graphics
          .lineStyle(1, 0xffffff)
          .moveTo(
            line.start.point.x -
              line.start.width / 2 +
              (line.start.width / laneTemplate.division) * i,
            line.start.point.y
          )
          .lineTo(
            line.end.point.x -
              line.end.width / 2 +
              (line.end.width / laneTemplate.division) * i,
            line.end.point.y
          );
      }

      /*

      graphics
        .lineStyle(1, Number(laneTemplate.color))
        .moveTo(line.start.point.x - line.start.width / 2, line.start.point.y)
        .lineTo(line.end.point.x - line.end.width / 2, line.end.point.y);
      graphics
        .lineStyle(1, Number(laneTemplate.color))
        .moveTo(line.start.point.x + line.start.width / 2, line.start.point.y)
        .lineTo(line.end.point.x + line.end.width / 2, line.end.point.y);
    
    */
    }
  }

  /**
   * 小節番号からノーツの位置とサイズを取得する
   * @param lane
   * @param measure
   * @param horizontal
   * @param vertical
   */
  getNotePointInfo(
    lane: Lane,
    measure: Measure,
    horizontal: Fraction,
    vertical: Fraction
  ): LinePointInfo | null {
    // y座標
    const y = measure.y + measure.height * (1 - vertical.to01Number());

    // y座標が含まれるライン
    const targetLine = (linesCache.get(lane) || []).find(
      line =>
        line.measure === measure &&
        line.start.point.y >= y &&
        line.end.point.y <= y
    );

    // ライン上でのy座標の位置
    const start = targetLine!.start;
    const end = targetLine!.end;
    const rate = inverseLerp(end.point.y, start.point.y, y);

    // x座標を補完で求める
    const getX = (info: LinePointInfo, i: number) =>
      info.point.x +
      info.width * (horizontal.to01Number() - 0.5 + i / horizontal.denominator);
    const left = lerp(getX(end, 0), getX(start, 0), rate);
    const right = lerp(getX(end, 1), getX(start, 1), rate);

    return {
      point: new Vector2((left + right) / 2, y),
      width: right - left
    };
  }

  // private linesCache: LineInfo[] = [];

  customRender(render: any) {}

  render(
    lane: Lane,
    graphics: PIXI.Graphics,
    lanePointMap: Map<string, LanePoint>,
    measures: Measure[],
    drawHorizontalLineTargetMeasure?: Measure,
    md = 4
  ): QuadAndIndex[] {
    const lines = getLines(
      lane.points.map(point => lanePointMap.get(point)!),
      measures
    );

    // console.log(lines);

    // キャッシュしておく
    linesCache.set(lane, lines);

    const laneTemplate = Pixi.instance!.injected.editor!.currentChart!.musicGameSystem!.laneTemplateMap.get(
      lane.templateName
    )!;

    this.defaultRender(graphics, lines, laneTemplate);

    // 選択中の小節に乗っているレーン
    const targetMeasureLines = !drawHorizontalLineTargetMeasure
      ? []
      : lines.filter(
          ({ measure }) => measure === drawHorizontalLineTargetMeasure
        );

    for (const line of targetMeasureLines) {
      for (var i = 1; i < lane.division; ++i) {
        graphics
          .lineStyle(1, 0xffffff)
          .moveTo(
            line.start.point.x -
              line.start.width / 2 +
              (line.start.width / lane.division) * i,
            line.start.point.y
          )
          .lineTo(
            line.end.point.x -
              line.end.width / 2 +
              (line.end.width / lane.division) * i,
            line.end.point.y
          );
      }
    }

    {
      const resultQuads: QuadAndIndex[] = [];

      if (drawHorizontalLineTargetMeasure && targetMeasureLines.length) {
        let pp = 0;

        // 対象の小節に存在してるレーン中間点の y 座標一覧
        var b3: number[] = Array.from(
          new Set(
            targetMeasureLines
              .map(line => [line.start.point.y, line.end.point.y])
              .reduce((acc: any, val: any) => acc.concat(val), [])
          )
        );

        // console.log(b3);

        // y 軸のライン
        const yLines: Line[] = [];
        // x 軸のライン
        const xLines: Line[][] = [];

        // 縦
        for (let i = 0; i < md + 1; ++i) {
          // 小節内分割ライン

          const y =
            drawHorizontalLineTargetMeasure!.y +
            (drawHorizontalLineTargetMeasure!.height / md) * i;

          const measureLine: Line = {
            start: new Vector2(drawHorizontalLineTargetMeasure!.x, y),
            end: new Vector2(
              drawHorizontalLineTargetMeasure!.x +
                drawHorizontalLineTargetMeasure!.width,
              y
            )
          };

          yLines.push(measureLine);
        }

        // 横
        for (let j = 0; j < lane.division + 1; ++j) {
          xLines[j] = [];

          for (const line of targetMeasureLines) {
            const linee: Line = {
              start: new Vector2(
                line.start.point.x -
                  line.start.width / 2 +
                  (line.start.width / lane.division) * j,
                line.start.point.y
              ),
              end: new Vector2(
                line.end.point.x -
                  line.end.width / 2 +
                  (line.end.width / lane.division) * j,
                line.end.point.y
              )
            };
            xLines[j].push(linee);
          }
        }

        // 縦
        for (let i = 0; i < md; ++i) {
          const yLine1 = yLines[i];
          const yLine2 = yLines[i + 1];

          const yLines2: Line[] = [yLine1];

          // 小節縦分割線 2 つの間に含まれている分割線

          const f = b3.filter(f => f > yLine1.start.y && f < yLine2.start.y);

          //          console.log("split", f.length);

          for (const ff of f) {
            const line = {
              start: new Vector2(yLine1.start.x, ff),
              end: new Vector2(yLine1.end.x, ff)
            };

            //drawLine(line, 10, 0xffffff);

            yLines2.push(line);
          }

          yLines2.push(yLine2);

          for (var kk = 0; kk < yLines2.length - 1; ++kk) {
            const yLine1 = yLines2[kk];
            const yLine2 = yLines2[kk + 1];

            //drawLine(yLine1, 4, 0xff00ff);

            // 横
            for (let j = 0; j < lane.division; ++j) {
              const xLine1 = xLines[j];
              const xLine2 = xLines[j + 1];

              for (var k = 0; k < xLine1.length; ++k) {
                const xll1 = xLine1[k];
                const xll2 = xLine2[k];

                var ret1 = lineIntersect(yLine1, xll1);
                var ret2 = lineIntersect(yLine1, xll2);
                var ret3 = lineIntersect(yLine2, xll1);
                var ret4 = lineIntersect(yLine2, xll2);

                if (ret1 && ret2 && ret3 && ret4) {
                  resultQuads.push({
                    a: ret1,
                    b: ret2,
                    c: ret3,
                    d: ret4,
                    horizontalIndex: j,
                    verticalIndex: i
                  });
                }
              }
            }
          }
        }
      }

      //  quadCache.set(lane, resultQuads);

      return resultQuads;
    }
  }
}

export default new LaneRenderer();
