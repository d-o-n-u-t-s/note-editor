import * as PIXI from "pixi.js";
import { LinePointInfo } from "./Lane";
import { Note } from "./Note";

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
  private customRender = defaultRender;

  public render(note: Note, graphics: PIXI.Graphics) {
    const linePointInfo = note.updateBounds();
    if (!linePointInfo) return;
    this.customRender(graphics, note, linePointInfo);
  }
}

export default new NoteRenderer() as INoteRenderer;
