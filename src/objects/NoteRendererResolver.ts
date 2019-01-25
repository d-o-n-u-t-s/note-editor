import Pixi from "../containers/Pixi";
import { Note } from "./Note";
import defaultNoteRenderer, {
  INoteRenderer,
  NoteRenderer
} from "./NoteRenderer";

export default class NoteRendererResolver {
  private static renderers = new WeakMap<any, any>();

  static resolve(note: Note): INoteRenderer {
    const noteType = Pixi.instance!.injected.editor!.currentChart!.musicGameSystem!.noteTypeMap.get(
      note.type
    )!;

    // デフォルトレンダラー
    if (noteType.renderer === "default") return defaultNoteRenderer;

    // レンダラー作成済み
    if (this.renderers.has(noteType.rendererReference)) {
      return this.renderers.get(noteType.rendererReference);
    } else if (noteType.rendererReference) {
      // レンダラー作成
      const renderer = {
        render: defaultNoteRenderer.render,
        customRender: noteType.rendererReference
      };
      this.renderers.set(noteType.rendererReference, renderer);
      return renderer;
    } else return defaultNoteRenderer;
  }
}
