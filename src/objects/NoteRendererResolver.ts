import INote from "./Note";
import NoteRenderer, { INoteRenderer } from "./NoteRenderer";
import Pixi from "../containers/Pixi";

export default class NoteRendererResolver {
  static resolve(note: INote): INoteRenderer {
    const noteType = Pixi.instance!.injected.editor!.currentChart!.musicGameSystem!.noteTypeMap.get(
      note.data.type
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
