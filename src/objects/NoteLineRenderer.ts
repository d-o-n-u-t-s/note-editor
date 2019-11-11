import Pixi from "../containers/Pixi";
import * as PIXI from "pixi.js";
import { Fraction } from "../math";
import Vector2 from "../math/Vector2";
import { drawQuad } from "../utils/drawQuad";
import { LineInfo } from "./Lane";
import { LanePoint } from "./LanePoint";
import { getLines } from "./LaneRenderer";
import { sortMeasure, sortMeasureData } from "./Measure";
import { Note } from "./Note";
import { NoteLine } from "./NoteLine";

export interface INoteLineRenderer {
  customRender(
    graphics: PIXI.Graphics,
    lines: LineInfo[],
    head: Note,
    tail: Note
  ): void;

  render(noteLine: NoteLine, graphics: PIXI.Graphics, notes: Note[]): void;
}

class NoteLineRenderer implements INoteLineRenderer {
  customRender(
    graphics: PIXI.Graphics,
    lines: LineInfo[],
    head: Note,
    tail: Note
  ) {
    for (const line of lines) {
      drawQuad(
        graphics,

        line.start.point,
        Vector2.add(line.start.point, new Vector2(line.start.width, 0)),
        Vector2.add(line.end.point, new Vector2(line.end.width, 0)),
        line.end.point,

        head.color
      );

      graphics
        .lineStyle(1, head.color, 1)
        .moveTo(line.start.point.x, line.start.point.y)
        .lineTo(line.end.point.x, line.end.point.y);
      graphics
        .lineStyle(1, head.color, 1)
        .moveTo(line.start.point.x + line.start.width, line.start.point.y)
        .lineTo(line.end.point.x + line.start.width, line.end.point.y);
    }
  }

  render(noteLine: NoteLine, graphics: PIXI.Graphics, notes: Note[]) {
    const {
      lanePointMap,
      noteMap,
      laneMap,
      measures
    } = Pixi.instance!.injected.editor!.currentChart!.timeline;

    let head = noteMap.get(noteLine.head)!;
    let tail = noteMap.get(noteLine.tail)!;

    if (!head.isVisible && !tail.isVisible) return;

    // head, tail をソート
    [head, tail] = [head, tail].sort(sortMeasureData);

    const lane = laneMap.get(head.lane)!;

    if (!lane) console.error(laneMap, head);

    const headPos = head.measureIndex + Fraction.to01(head.measurePosition);
    const tailPos = tail.measureIndex + Fraction.to01(tail.measurePosition);

    const length = tailPos - headPos;

    const cloneLanePoint = (lanePoint: LanePoint) => ({
      ...lanePoint,
      horizontalPosition: Fraction.clone(lanePoint.horizontalPosition),
      measurePosition: Fraction.clone(lanePoint.measurePosition)
    });

    head.updateBounds();
    tail.updateBounds();

    const headBounds = head.getBounds();
    const tailBounds = tail.getBounds();

    // 先頭ノートと末尾ノートの間にあるレーン中間ポイントを取得する
    let lps = lane.points
      .map(guid => lanePointMap.get(guid)!)
      .filter(lp => {
        const n = lp.measureIndex + Fraction.to01(lp.measurePosition);

        return n > headPos && n < tailPos;
      })
      .sort(sortMeasure)

      .map(lp => {
        lp = cloneLanePoint(lp);

        const pos = lp.measureIndex + Fraction.to01(lp.measurePosition);
        const s = pos - headPos;

        // 現在の位置
        const pp = s / length;

        // 先頭ノートが配置してある位置のレーンの横幅
        const headNoteLaneWidth =
          (headBounds.width / head.horizontalSize) *
          head.horizontalPosition.denominator;

        // 末尾ノートが配置してある位置のレーンの横幅
        const tailNoteLaneWidth =
          (tailBounds.width / tail.horizontalSize) *
          tail.horizontalPosition.denominator;

        // 先頭ノートが配置してあるレーンの左座標
        const headNoteLaneLeft =
          headBounds.x -
          (headNoteLaneWidth / head.horizontalPosition.denominator) *
            head.horizontalPosition.numerator;

        // 末尾ノートが配置してあるレーンの左座標
        const tailNoteLaneLeft =
          tailBounds.x -
          (tailNoteLaneWidth / tail.horizontalPosition.denominator) *
            tail.horizontalPosition.numerator;

        const headLaneNormalizedHorizontalPos =
          (headBounds.x - headNoteLaneLeft) / headNoteLaneWidth;
        const tailLaneNormalizedHorizontalPos =
          (tailBounds.x - tailNoteLaneLeft) / tailNoteLaneWidth;

        const measureW = measures[lp.measureIndex].width;

        const curSize =
          headBounds.width + (tailBounds.width - headBounds.width) * pp;

        const s_pos =
          headLaneNormalizedHorizontalPos +
          (tailLaneNormalizedHorizontalPos - headLaneNormalizedHorizontalPos) *
            pp;

        // レーンの左
        const left =
          Fraction.to01(lp.horizontalPosition) * measureW +
          (measureW / lp.horizontalPosition.denominator) *
            lp.horizontalSize *
            s_pos;

        lp.horizontalSize = curSize;
        lp.horizontalPosition = new Fraction(left, measureW);
        return lp;
      });

    const noteToLanePoint = (note: Note, noteBounds: PIXI.Rectangle) => {
      return {
        horizontalSize: noteBounds.width,
        horizontalPosition: new Fraction(
          noteBounds.x - measures[note.measureIndex].x,
          measures[note.measureIndex].width
        ),
        measureIndex: note.measureIndex,
        measurePosition: Fraction.clone(note.measurePosition)
      } as LanePoint;
    };

    lps = [
      noteToLanePoint(head, headBounds),
      ...lps,
      noteToLanePoint(tail, tailBounds)
    ];

    const lines = getLines(lps, measures);

    this.customRender(graphics, lines, head, tail);
  }
}

export default new NoteLineRenderer() as INoteLineRenderer;
