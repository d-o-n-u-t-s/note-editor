import Pixi from "../containers/Pixi";
import MeasureRenderer, { IMeasureRenderer } from "./MeasureRenderer";

export default class MeasureRendererResolver {
  static resolve(): IMeasureRenderer {
    const measureOption = Pixi.instance!.injected.editor!.currentChart!
      .musicGameSystem.measure;

    if (measureOption.renderer === "default") return MeasureRenderer;

    if (measureOption.rendererReference) {
      return {
        render: measureOption.rendererReference,
      };
    } else return MeasureRenderer;
  }
}
