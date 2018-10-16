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

export interface NotePointInfo {
  lane: Lane;
  linePointInfo: LinePointInfo;
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
      return {
        point: new Vector2(
          measure.x + measure.width * lerp(p1.x, p2.x, p),
          measure.y + measure.height * (measureIndex + 1 - value)
        ),
        width: measure.width * lerp(p1.width, p2.width, p)
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
  getNotePointInfoFromMousePosition(
    lane: Lane,
    measure: Measure,
    measureDivision: number,
    mousePosition: Vector2
  ): NotePointInfo | null;
  render(
    lane: Lane,
    graphics: PIXI.Graphics,
    lanePointMap: Map<string, LanePoint>,
    measures: Measure[],
    drawHorizontalLineTargetMeasure?: Measure
  ): void;

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
        line.start.point,
        Vector2.add(line.start.point, new Vector2(line.start.width, 0)),
        Vector2.add(line.end.point, new Vector2(line.end.width, 0)),
        line.end.point,
        Number(laneTemplate.color)
      );

      for (var i = 0; i < laneTemplate.division + 1; ++i) {
        graphics
          .lineStyle(1, 0xffffff)
          .moveTo(
            line.start.point.x + (line.start.width / laneTemplate.division) * i,
            line.start.point.y
          )
          .lineTo(
            line.end.point.x + (line.end.width / laneTemplate.division) * i,
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
    if (!targetLine) {
      return null;
    }

    // ライン上でのy座標の位置
    const start = targetLine!.start;
    const end = targetLine!.end;
    const rate = inverseLerp(end.point.y, start.point.y, y);

    // x座標を補完で求める
    const getX = (info: LinePointInfo, i: number) =>
      info.point.x +
      info.width * (horizontal.to01Number() + i / horizontal.denominator);
    const left = lerp(getX(end, 0), getX(start, 0), rate);
    const right = lerp(getX(end, 1), getX(start, 1), rate);

    return {
      point: new Vector2(left, y),
      width: right - left
    };
  }

  getNotePointInfoFromMousePosition(
    lane: Lane,
    measure: Measure,
    measureDivision: number,
    mousePosition: Vector2
  ): NotePointInfo | null {
    const height = measure.height / measureDivision / 2;
    const horizontal = new Fraction(0, lane.division);
    const vertical = new Fraction(0, measureDivision);

    for (var i = 0; i < lane.division; i++) {
      horizontal.numerator = i;
      for (var j = 0; j < measureDivision; j++) {
        vertical.numerator = j;
        const data = this.getNotePointInfo(lane, measure, horizontal, vertical);
        if (
          data &&
          mousePosition.x > data!.point.x &&
          mousePosition.x < data!.point.x + data!.width &&
          mousePosition.y > data!.point.y - height &&
          mousePosition.y < data!.point.y + height
        ) {
          return {
            lane,
            linePointInfo: data!,
            horizontalIndex: i,
            verticalIndex: measureDivision - j - 1
          };
        }
      }
    }
    return null;
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
  ): void {
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
            line.start.point.x + (line.start.width / lane.division) * i,
            line.start.point.y
          )
          .lineTo(
            line.end.point.x + (line.end.width / lane.division) * i,
            line.end.point.y
          );
      }
    }
  }
}

export default new LaneRenderer();
