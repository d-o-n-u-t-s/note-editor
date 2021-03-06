import Pixi from "../containers/Pixi";
import { NoteLine } from "./NoteLine";
import NoteLineRenderer, { INoteLineRenderer } from "./NoteLineRenderer";

export default class NoteLineRendererResolver {
  static resolve(noteLine: NoteLine): INoteLineRenderer {
    const headNote = Pixi.instance!.injected.editor!.currentChart!.timeline.noteMap.get(
      noteLine.head
    )!;

    const customRenderer = Pixi.instance!.injected.editor!.currentChart!.musicGameSystem.customNoteLineRendererMap.get(
      headNote.type
    );

    if (!customRenderer) return NoteLineRenderer;

    if (customRenderer.rendererReference) {
      return {
        customRender: customRenderer.rendererReference as any,
        render: NoteLineRenderer.render,
      };
    } else return NoteLineRenderer;
  }
}
