import TimelineObject from "./TimelineObject";
import LanePoint from "./LanePoint";
import Measure from "./Measure";
import { Fraction, Vector2 } from "../math";
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
  const lines: LineInfo[] = [];

  points = points.slice().sort(sortMeasure);

  const line = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    w1: number,
    w2: number,
    measure: Measure
  ) => {
    lines.push({
      measure,
      start: { point: new Vector2(x1, y1), width: w1 },
      end: { point: new Vector2(x2, y2), width: w2 }
    });
  };

  for (let i = 0; i < points.length - 1; ++i) {
    const p1 = points[i];
    const p2 = points[i + 1];

    const m1 = measures[p1.measureIndex];
    const m2 = measures[p2.measureIndex];

    // 同じレーンに存在しているなら
    if (m1 === m2) {
      const measure = m1;

      const w1 =
        (measure.width / p1.horizontalPosition.denominator) * p1.horizontalSize;
      const w2 =
        (measure.width / p2.horizontalPosition.denominator) * p2.horizontalSize;

      line(
        measure.x + p1.horizontalPosition.to01Number() * measure.width + w1 / 2,

        measure.y +
          measure.height -
          measure.height * p1.measurePosition.to01Number(),

        measure.x + p2.horizontalPosition.to01Number() * measure.width + w2 / 2,

        measure.y + measure.height * (1 - p2.measurePosition.to01Number()),

        w1,
        w2,
        measure
      );
    } else {
      const a: {
        percentage: number;
        measureIndex: number;
        horizontalPosition: number;
      }[] = [];

      a.push({
        percentage: 1 - p1.measurePosition.to01Number(),
        measureIndex: p1.measureIndex,
        horizontalPosition: 0
      });

      // p1 と p2 の間に存在する小節をチェック
      for (var i2 = p1.measureIndex + 1; i2 < p2.measureIndex; ++i2) {
        a.push({
          percentage: 1,
          measureIndex: i2,
          horizontalPosition: 0
        });
      }

      a.push({
        percentage: p2.measurePosition.to01Number(),
        measureIndex: p2.measureIndex,
        horizontalPosition: 0
      });

      // レーン全体の長さ
      const sumPer = a.map(b => b.percentage).reduce((a, b) => a + b);

      let currentPer = 0;

      const left = p1.horizontalPosition.to01Number();
      const sa = p2.horizontalPosition.to01Number() - left;

      // 0 ~ (last-1) 番目の小節に線を引く
      for (var j = 0; j < a.length - 1; ++j) {
        const b = a[j];
        // const e = a[j + 1];

        const measure = measures[b.measureIndex];

        const x1 =
          measures[b.measureIndex].x +
          (left + (sa / sumPer) * currentPer) * measures[b.measureIndex].width;

        const x2 =
          measures[b.measureIndex].x +
          (left + (sa / sumPer) * (currentPer + b.percentage)) *
            measures[b.measureIndex].width;

        const w1 =
          (measure.width / p1.horizontalPosition.denominator) *
          p1.horizontalSize;

        const w2 =
          (measure.width / p2.horizontalPosition.denominator) *
          p2.horizontalSize;
        const ww1 = w1 + ((w2 - w1) / sumPer) * currentPer;
        const ww2 = w1 + ((w2 - w1) / sumPer) * (currentPer + b.percentage);

        line(
          x1 + ww1 / 2,
          measures[b.measureIndex].y +
            b.percentage * measures[b.measureIndex].height,

          x2 + ww2 / 2,
          measures[b.measureIndex].y,
          ww1,
          ww2,
          measure
        );

        currentPer += b.percentage;
      }

      // last 番目の小節に線を引く
      {
        const b = a.pop()!;

        if ((window as any).testtest) {
          console.log("last", b);
        }

        const measure = measures[b.measureIndex];

        const x1 =
          measures[b.measureIndex].x +
          (left + (sa / sumPer) * currentPer) * measures[b.measureIndex].width;

        const x2 =
          measures[b.measureIndex].x +
          (left + (sa / sumPer) * (currentPer + b.percentage)) *
            measures[b.measureIndex].width;

        const w1 =
          (measure.width / p1.horizontalPosition.denominator) *
          p1.horizontalSize;

        const w2 =
          (measure.width / p2.horizontalPosition.denominator) *
          p2.horizontalSize;
        const ww1 = w1 + ((w2 - w1) / sumPer) * currentPer;
        const ww2 = w1 + ((w2 - w1) / sumPer) * (currentPer + b.percentage);

        line(
          x1 + ww1 / 2,
          measures[b.measureIndex].y + measures[b.measureIndex].height,
          x2 + ww2 / 2,
          measures[b.measureIndex].y +
            (1 - b.percentage) * measures[b.measureIndex].height,

          ww1,
          ww2,
          measure
        );
      }
    }
  }

  return lines;
}

const linesCache = new WeakMap<Lane, LineInfo[]>();

export interface ILaneRenderer {
  getQuad(
    lane: Lane,
    measure: Measure,
    horizontal: Fraction,
    vertical: Fraction
  ): LinePointInfo | null;
  render(
    lane: Lane,
    graphics: PIXI.Graphics,
    lanePoints: LanePoint[],
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

  getQuad(
    lane: Lane,
    measure: Measure,
    horizontal: Fraction,
    vertical: Fraction
  ): LinePointInfo | null {
    // 選択中の小節に乗っているレーン
    const targetMeasureLines = (linesCache.get(lane) || []).filter(
      ({ measure: _measure }) => _measure === measure
    );

    // y 軸のライン
    // const yLines: Line[] = [];
    // x 軸のライン
    const xLines: Line[][] = [];

    // console.log(targetMeasureLines);
    // 縦
    // {
    //for (var i = 0; i < 1; ++i) {
    const y =
      measure.y +
      measure.height -
      (measure.height / vertical.denominator) * vertical.numerator;

    const measureLine: Line = {
      start: new Vector2(measure!.x, y),
      end: new Vector2(measure!.x + measure!.width, y)
    };

    //}
    // }

    // 横

    for (var i = 0; i < 2; ++i) {
      xLines[i] = [];

      for (const line of targetMeasureLines) {
        const linee: Line = {
          start: new Vector2(
            line.start.point.x -
              line.start.width / 2 +
              (line.start.width / horizontal.denominator) *
                (horizontal.numerator + i),
            line.start.point.y
          ),
          end: new Vector2(
            line.end.point.x -
              line.end.width / 2 +
              (line.end.width / horizontal.denominator) *
                (horizontal.numerator + i),
            line.end.point.y
          )
        };
        /*
          Pixi.debugGraphics!.lineStyle(4, 0xff00ff)
            .moveTo(linee.start.x, linee.start.y)
            .lineTo(linee.end.x, linee.end.y);
  */
        xLines[i].push(linee);
      }
    }

    //  return null;

    // 横
    for (let j = 0; j < xLines[0].length; ++j) {
      const xLine1 = xLines[0][j];
      const xLine2 = xLines[1][j];

      const xll1 = xLine1;
      const xll2 = xLine2;

      var ret1 = lineIntersect(xll1, measureLine);
      var ret2 = lineIntersect(xll2, measureLine);

      /*
        Pixi.debugGraphics!.lineStyle(8, 0xff00ff, 0.2)
          .moveTo(measureLine.start.x, measureLine.start.y)
          .lineTo(measureLine.end.x, measureLine.end.y);
        /*
  
        Pixi.debugGraphics!.lineStyle(8, 0xffffff, 0.2)
          .moveTo(yLines[1].start.x, yLines[1].start.y)
          .lineTo(yLines[1].end.x, yLines[1].end.y);
          */
      /*
        Pixi.debugGraphics!.lineStyle(4, 0xff00ff)
          .moveTo(xll1.start.x, xll1.start.y)
          .lineTo(xll1.end.x, xll1.end.y);
  
        Pixi.debugGraphics!.lineStyle(4, 0xff00ff)
          .moveTo(xll2.start.x, xll2.start.y)
          .lineTo(xll2.end.x, xll2.end.y);
  
        /*
  
        if (ret1) Pixi.instance!.drawTempText("1", ret1.x, ret1.y);
        if (ret2) Pixi.instance!.drawTempText("2", ret2.x, ret2.y);
        if (ret3) Pixi.instance!.drawTempText("3", ret3.x, ret3.y);
        if (ret4) Pixi.instance!.drawTempText("4", ret4.x, ret4.y);
        */
      // console.log(ret1, ret2);
      if (ret1 && ret2) {
        return {
          point: Vector2.add(ret1, ret2).multiplyScalar(0.5),
          width: ret2.x - ret1.x
        };
      }
    }
    return null;
  }

  // private linesCache: LineInfo[] = [];

  customRender(render: any) {}

  render(
    lane: Lane,
    graphics: PIXI.Graphics,
    lanePoints: LanePoint[],
    measures: Measure[],
    drawHorizontalLineTargetMeasure?: Measure,
    md = 4
  ): QuadAndIndex[] {
    const lines = getLines(
      lane.points.map(
        point => lanePoints.find(lanePoint => lanePoint.guid === point)!
      ),
      measures
    );

    // キャッシュしておく
    linesCache.set(lane, lines);

    const laneTemplate = Pixi.instance!.props.editor!.currentChart!.musicGameSystem!.laneTemplates.find(
      lt => lt.name === lane.templateName
    )!;

    this.defaultRender(graphics, lines, laneTemplate);

    // 選択中の小節に乗っているレーン
    const targetMeasureLines = lines.filter(
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
