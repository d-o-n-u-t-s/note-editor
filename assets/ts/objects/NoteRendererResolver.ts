import Lane from "./Lane";
import Note from "./Note";
import NoteRenderer, { INoteRenderer } from "./NoteRenderer";
import Pixi from "../Pixi";

export default class NoteRendererResolver {
  static resolve(note: Note): INoteRenderer {
    const noteType = Pixi.instance!.injected.editor!.currentChart!.musicGameSystem!.noteTypeMap.get(
      note.type
    )!;

    // console.log(noteType.rendererReference);

    if (noteType.renderer === "default") return NoteRenderer;

    if (noteType.rendererReference) {
      return {
        getBounds: NoteRenderer.getBounds,
        render: NoteRenderer.render,

        customRender: noteType.rendererReference as any
      } as any;
    } else return NoteRenderer;
  }
}
