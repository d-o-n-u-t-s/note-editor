import Measure from "./Measure";
import INote from "./Note";
import Pixi from "../Pixi";
import Lane, { LinePointInfo } from "./Lane";

import LaneRendererResolver from "./LaneRendererResolver";

export interface INoteRenderer {
  getBounds(note: INote, lane: Lane, measure: Measure): PIXI.Rectangle;

  render(
    target: INote,
    graphics: PIXI.Graphics,
    lane: Lane,
    measure: Measure
  ): void;
}

class NoteRenderer implements INoteRenderer {
  getBounds(note: INote, lane: Lane, measure: Measure): PIXI.Rectangle {
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

  customRender(graphics: PIXI.Graphics, note: INote, area: LinePointInfo) {
    const q = area;

    graphics
      .lineStyle(6, note.editorProps.color)
      .moveTo(q.point.x, q.point.y)
      .lineTo(q.point.x + q.width, q.point.y);
  }

  render(note: INote, graphics: PIXI.Graphics, lane: Lane, measure: Measure) {
    const measureBounds = measure.getBounds();

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
