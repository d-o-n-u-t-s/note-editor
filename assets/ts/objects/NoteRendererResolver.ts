import Lane from "./Lane";
import Note from "./Note";
import NoteRenderer, { INoteRenderer } from "./NoteRenderer";
import Pixi from "../Pixi";

export default class NoteRendererResolver {
  static resolve(note: Note): INoteRenderer {
    const noteType = Pixi.instance!.props.editor!.currentChart!.musicGameSystem!.noteTypes.find(
      lt => lt.name === note.type
    )!;

    if (noteType.renderer === "default") return NoteRenderer;

    if (noteType.rendererReference) {
      //  console.log(laneTemplate.rendererReference);

      return {
        getBounds: NoteRenderer.getBounds,
        render: NoteRenderer.render,

        customRender: noteType.rendererReference as any
      } as any;
    } else return NoteRenderer;
  }
}
