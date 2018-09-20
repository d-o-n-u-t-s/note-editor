import { Fraction } from "../math";
import TimelineObject from "./TimelineObject";
import { GUID, guid } from "../util";
import Lane, { LineInfo } from "./Lane";
import {
  sortQuadPoint,
  sortQuadPointFromQuad,
  drawQuad
} from "../utils/drawQuad";
import Measure, { sortMeasure } from "./Measure";
import Note from "./Note";
import NoteRenderer from "./NoteRenderer";
import NoteLine from "./NoteLine";
import Pixi from "../Pixi";

export interface INoteLineRenderer {
  customRender(
    graphics: PIXI.Graphics,
    lines: LineInfo[],
    head: Note,
    tail: Note
  ): void;

  render(noteLine: NoteLine, graphics: PIXI.Graphics, notes: Note[]): void;
}

import { getLines } from "./LaneRenderer";
import LanePoint from "./LanePoint";
import Vector2 from "../math/Vector2";

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

        Vector2.sub(line.start.point, new Vector2(-line.start.width / 2, 0)),
        Vector2.sub(line.start.point, new Vector2(line.start.width / 2, 0)),
        Vector2.sub(line.end.point, new Vector2(line.end.width / 2, 0)),
        Vector2.sub(line.end.point, new Vector2(-line.end.width / 2, 0)),

        head.color
      );

      graphics
        .lineStyle(1, head.color, 1)
        .moveTo(line.start.point.x - line.start.width / 2, line.start.point.y)
        .lineTo(line.end.point.x - line.start.width / 2, line.end.point.y);
      graphics
        .lineStyle(1, head.color, 1)
        .moveTo(line.start.point.x + line.start.width / 2, line.start.point.y)
        .lineTo(line.end.point.x + line.start.width / 2, line.end.point.y);
    }
  }

  render(noteLine: NoteLine, graphics: PIXI.Graphics, notes: Note[]) {
    const measures = Pixi.instance!.measures;
    const {
      lanes,
      lanePoints
    } = Pixi.instance!.props.editor!.currentChart!.timeline;

    let head = notes.find(note => note.guid === noteLine.head)!;
    let tail = notes.find(note => note.guid === noteLine.tail)!;

    //    return;

    // head, tail をソート
    [head, tail] = [head, tail].sort(sortMeasure);

    const lane = lanes.find(l => l.guid === head.lane)!;

    const headPos = head.measureIndex + head.measurePosition.to01Number();
    const tailPos = tail.measureIndex + tail.measurePosition.to01Number();

    // console.log("head", head.guid);

    // console.log("headPos", headPos);
    //  console.log("tailPos", tailPos);

    const length = tailPos - headPos;

    const cloneLanePoint = (lanePoint: LanePoint) => ({
      ...lanePoint,
      horizontalPosition: lanePoint.horizontalPosition.clone(),
      measurePosition: lanePoint.measurePosition.clone()
    });

    const headBounds = NoteRenderer.getBounds(
      head,
      lane,
      measures[head.measureIndex]
    );

    //console.log("headBounds: " + headBounds.x);

    const tailBounds = NoteRenderer.getBounds(
      tail,
      lanes.find(l => l.guid === tail.lane)!,
      measures[tail.measureIndex]
    );

    let prevPos = headPos;
    // let prevBounds = headBounds;

    // 先頭ノートと末尾ノートの間にあるレーン中間ポイントを取得する
    let lps = lane.points
      .map(guid => lanePoints.find(lp => lp.guid === guid)!)
      .filter(lp => {
        const n = lp.measureIndex + lp.measurePosition.to01Number();

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

        const pos = lp.measureIndex + lp.measurePosition.to01Number();

        // const bounds = lp.renderer!.

        const s = pos - headPos;
        // prevPos = pos;

        // 現在の位置
        const pp = s / length;

        const measure = measures[lp.measureIndex];

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
          lp.horizontalPosition.to01Number() * measureW +
          (measureW / lp.horizontalPosition.denominator) *
            lp.horizontalSize *
            s_pos;

        lp.horizontalSize = curSize;
        lp.horizontalPosition = new Fraction(left, measureW);
        return lp;
      });
    // console.log(head, tail);

    const noteToLanePoint = (note: Note, noteBounds: PIXI.Rectangle) => {
      return {
        horizontalSize: noteBounds.width,
        horizontalPosition: new Fraction(
          noteBounds.x - measures[note.measureIndex].x,
          measures[note.measureIndex].width
        ),
        measureIndex: note.measureIndex,
        measurePosition: note.measurePosition.clone()
      } as LanePoint;
    };

    lps = [
      noteToLanePoint(head, headBounds),
      ...lps,
      noteToLanePoint(tail, tailBounds)
    ];

    //  (window as any).testtest = true;

    //  console.log(lps.length);

    const lines = getLines(lps, measures);

    this.customRender(graphics, lines, head, tail);
  }
}

export default new NoteLineRenderer() as INoteLineRenderer;
