import { Fraction, Vector2 } from "../math";
import TimelineObject from "./TimelineObject";
import { GUID, guid } from "../util";
import Lane from "./Lane";
import { sortQuadPoint, sortQuadPointFromQuad } from "../utils/drawQuad";
import Measure from "./Measure";
import Note from "./Note";
import Pixi from "../Pixi";

import LaneRendererResolver from "./LaneRendererResolver";

interface INoteRenderer {
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
      q.width,
      10
    );
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

    Pixi.instance!.drawTempText(
      `${note.measureIndex}:${note.measurePosition}`,
      q.point.x,
      q.point.y,
      {
        fontSize: 12
      }
    );

    graphics
      // .lineStyle(4, note.color)
      .lineStyle(6, 0xff0000)
      .moveTo(q.point.x - q.width / 2, q.point.y)
      .lineTo(q.point.x + q.width / 2, q.point.y);
  }
}

export default new NoteRenderer() as INoteRenderer;
