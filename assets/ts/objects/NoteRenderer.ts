import { Fraction, Vector2 } from "../math";
import TimelineObject from "./TimelineObject";
import { GUID, guid } from "../util";
import { sortQuadPoint, sortQuadPointFromQuad } from "../utils/drawQuad";
import Measure from "./Measure";
import Note from "./Note";
import Pixi from "../Pixi";
import Lane, { LinePointInfo, LineInfo } from "./Lane";

import LaneRendererResolver from "./LaneRendererResolver";

export interface INoteRenderer {
  getBounds(note: Note, lane: Lane, measure: Measure): PIXI.Rectangle;

  render(
    target: Note,
    graphics: PIXI.Graphics,
    lane: Lane,
    measure: Measure
  ): void;
}

class NoteRenderer implements INoteRenderer {
  getBounds(note: Note, lane: Lane, measure: Measure): PIXI.Rectangle {
    const q = LaneRendererResolver.resolve(lane).getQuad(
      lane,
      measure,
      note.horizontalPosition,
      note.measurePosition
    )!;

    return new PIXI.Rectangle(
      q.point.x - q.width / 2,
      q.point.y - 5,
      q.width * note.horizontalSize,
      10
    );
  }

  customRender(graphics: PIXI.Graphics, note: Note, area: LinePointInfo) {
    const q = area;

    graphics
      // .lineStyle(4, note.color)
      .lineStyle(6, note.color)
      .moveTo(q.point.x - q.width / 2, q.point.y)
      .lineTo(q.point.x + q.width / 2, q.point.y);
  }

  render(note: Note, graphics: PIXI.Graphics, lane: Lane, measure: Measure) {
    const q = LaneRendererResolver.resolve(lane).getQuad(
      lane,
      measure,
      note.horizontalPosition,
      note.measurePosition
    );

    if (!q) {
      return console.error("ノートの描画範囲が計算できません");
    }

    q.point.x += ((note.horizontalSize - 1) * q.width) / 2;
    q.width *= note.horizontalSize;

    /*
    Pixi.instance!.drawTempText(
      `${note.measureIndex}:${note.measurePosition}`,
      q.point.x,
      q.point.y,
      {
        fontSize: 12
      }
    );
    */

    this.customRender(graphics, note, q);
  }
}

export default new NoteRenderer() as INoteRenderer;
