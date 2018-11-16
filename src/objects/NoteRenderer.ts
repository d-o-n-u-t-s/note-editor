import Measure from "./Measure";
import Note from "./Note";
import Pixi from "../containers/Pixi";
import Lane, { LinePointInfo } from "./Lane";

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

export function defaultRender(
  graphics: PIXI.Graphics,
  note: Note,
  area: LinePointInfo
) {
  graphics
    .lineStyle(6, note.editorProps.color)
    .moveTo(area.point.x, area.point.y)
    .lineTo(area.point.x + area.width, area.point.y);
}

class NoteRenderer implements INoteRenderer {
  getBounds(note: Note, lane: Lane, measure: Measure): PIXI.Rectangle {
    const q = LaneRendererResolver.resolve(lane).getNotePointInfo(
      lane,
      measure,
      note.horizontalPosition,
      note.measurePosition
    )!;

    return new PIXI.Rectangle(
      q.point.x,
      q.point.y - 5,
      q.width * note.horizontalSize,
      10
    );
  }

  customRender = defaultRender;

  render(note: Note, graphics: PIXI.Graphics, lane: Lane, measure: Measure) {
    const q = LaneRendererResolver.resolve(lane).getNotePointInfo(
      lane,
      measure,
      note.horizontalPosition,
      note.measurePosition
    );

    if (!q) {
      return console.error("ノートの描画範囲が計算できません");
    }

    q.width *= note.horizontalSize;

    this.customRender(graphics, note, q);
  }
}

export default new NoteRenderer() as INoteRenderer;
