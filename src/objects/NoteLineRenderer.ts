import { Fraction } from "../math";
import { LineInfo } from "./Lane";
import { drawQuad } from "../utils/drawQuad";
import { sortMeasure, sortMeasureData } from "./Measure";
import INote from "./Note";
import NoteRenderer from "./NoteRenderer";
import NoteLine from "./NoteLine";
import Pixi from "../containers/Pixi";

export interface INoteLineRenderer {
  customRender(
    graphics: PIXI.Graphics,
    lines: LineInfo[],
    head: INote,
    tail: INote
  ): void;

  render(noteLine: NoteLine, graphics: PIXI.Graphics, notes: INote[]): void;
}

import { getLines } from "./LaneRenderer";
import LanePoint from "./LanePoint";
import Vector2 from "../math/Vector2";

class NoteLineRenderer implements INoteLineRenderer {
  customRender(
    graphics: PIXI.Graphics,
    lines: LineInfo[],
    head: INote,
    tail: INote
  ) {
    for (const line of lines) {
      drawQuad(
        graphics,

        line.start.point,
        Vector2.add(line.start.point, new Vector2(line.start.width, 0)),
        Vector2.add(line.end.point, new Vector2(line.end.width, 0)),
        line.end.point,

        head.data.editorProps.color
      );

      graphics
        .lineStyle(1, head.data.editorProps.color, 1)
        .moveTo(line.start.point.x, line.start.point.y)
        .lineTo(line.end.point.x, line.end.point.y);
      graphics
        .lineStyle(1, head.data.editorProps.color, 1)
        .moveTo(line.start.point.x + line.start.width, line.start.point.y)
        .lineTo(line.end.point.x + line.start.width, line.end.point.y);
    }
  }

  render(noteLine: NoteLine, graphics: PIXI.Graphics, notes: INote[]) {
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

    const lane = laneMap.get(head.data.lane)!;

    if (!lane) console.error(laneMap);

    const headPos =
      head.data.measureIndex + Fraction.to01(head.data.measurePosition);
    const tailPos =
      tail.data.measureIndex + Fraction.to01(tail.data.measurePosition);

    const length = tailPos - headPos;

    const cloneLanePoint = (lanePoint: LanePoint) => ({
      ...lanePoint,
      horizontalPosition: lanePoint.horizontalPosition.clone(),
      measurePosition: lanePoint.measurePosition.clone()
    });

    const headBounds = NoteRenderer.getBounds(
      head,
      lane,
      measures[head.data.measureIndex]
    );

    const tailBounds = NoteRenderer.getBounds(
      tail,
      laneMap.get(tail.data.lane)!,
      measures[tail.data.measureIndex]
    );

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

        /*
        Pixi.debugGraphics!.lineStyle(0)
          .beginFill(0x00ff00, 0.5)
          .drawRect(
            headBounds.x,
            headBounds.y,
            headBounds.width,
            headBounds.height
          )
          .endFill();

          */
        //  return lp;

        const pos = lp.measureIndex + Fraction.to01(lp.measurePosition);

        // const bounds = lp.renderer!.

        const s = pos - headPos;
        // prevPos = pos;

        // 現在の位置
        const pp = s / length;

        // 先頭ノートが配置してある位置のレーンの横幅
        const headNoteLaneWidth =
          (headBounds.width / head.data.horizontalSize) *
          head.data.horizontalPosition.denominator;

        // 末尾ノートが配置してある位置のレーンの横幅
        const tailNoteLaneWidth =
          (tailBounds.width / tail.data.horizontalSize) *
          tail.data.horizontalPosition.denominator;

        // 先頭ノートが配置してあるレーンの左座標
        const headNoteLaneLeft =
          headBounds.x -
          (headNoteLaneWidth / head.data.horizontalPosition.denominator) *
            head.data.horizontalPosition.numerator;

        // 末尾ノートが配置してあるレーンの左座標
        const tailNoteLaneLeft =
          tailBounds.x -
          (tailNoteLaneWidth / tail.data.horizontalPosition.denominator) *
            tail.data.horizontalPosition.numerator;

        const headLaneNormalizedHorizontalPos =
          (headBounds.x - headNoteLaneLeft) / headNoteLaneWidth;
        const tailLaneNormalizedHorizontalPos =
          (tailBounds.x - tailNoteLaneLeft) / tailNoteLaneWidth;

        /*
        Pixi.debugGraphics!.lineStyle(8, 0xffff00, 0.6)
          .moveTo(measure.x, 0)
          .lineTo(measure.x, 2000);
*/

        const measureW = measures[lp.measureIndex].width;

        // lerp(headBounds.width, tailBounds.width, pp)
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
    // console.log(head, tail);

    const noteToLanePoint = (note: INote, noteBounds: PIXI.Rectangle) => {
      return {
        horizontalSize: noteBounds.width,
        horizontalPosition: new Fraction(
          noteBounds.x - measures[note.data.measureIndex].x,
          measures[note.data.measureIndex].width
        ),
        measureIndex: note.data.measureIndex,
        measurePosition: Fraction.clone(note.data.measurePosition)
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
