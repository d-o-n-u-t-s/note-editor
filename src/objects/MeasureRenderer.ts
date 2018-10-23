import Measure from "./Measure";

export interface IMeasureRenderer {
  render(graphics: PIXI.Graphics, measure: Measure, measures: Measure[]): void;
}

/**
 * デフォルトの小節レンダラー
 */
class MeasureDefaultRenderer implements IMeasureRenderer {
  render(graphics: PIXI.Graphics, measure: Measure, measures: Measure[]) {
    const { x, y, width, height } = measure;

    graphics
      .lineStyle(2, 0xffffff)
      .beginFill(0x333333)
      .drawRect(x, y, width, height)
      .endFill();
  }
}

export default new MeasureDefaultRenderer() as IMeasureRenderer;
