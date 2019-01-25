import { Lane, LinePointInfo } from "./Lane";
import LaneRendererResolver from "./LaneRendererResolver";
import { Measure } from "./Measure";
import { Note } from "./Note";

export interface INoteRenderer {
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

export class NoteRenderer implements INoteRenderer {
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

    // note.updateBounds
    note.x = q.point.x;
    note.y = q.point.y - 5;
    note.width = q.width;
    note.height = 10;

    this.customRender(graphics, note, q);
  }
}

export default new NoteRenderer() as INoteRenderer;
