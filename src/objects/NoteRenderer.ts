import { LinePointInfo } from "./Lane";
import { Note } from "./Note";
import * as PIXI from "pixi.js";

export interface INoteRenderer {
  render(target: Note, graphics: PIXI.Graphics): void;
}

export function defaultRender(
  graphics: PIXI.Graphics,
  note: Note,
  area: LinePointInfo
) {
  graphics
    .lineStyle(6, note.color)
    .moveTo(area.point.x, area.point.y)
    .lineTo(area.point.x + area.width, area.point.y);
}

export class NoteRenderer implements INoteRenderer {
  customRender = defaultRender;

  render(note: Note, graphics: PIXI.Graphics) {
    const linePointInfo = note.updateBounds();
    this.customRender(graphics, note, linePointInfo!);
  }
}

export default new NoteRenderer() as INoteRenderer;
