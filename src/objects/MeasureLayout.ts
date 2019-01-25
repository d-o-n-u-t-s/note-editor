import * as PIXI from "pixi.js";
import { Fraction } from "../math";
import EditorSetting from "../stores/EditorSetting";
import { Measure } from "./Measure";

export interface IMeasureLayout {
  name: string;

  /**
   * 小節をレイアウトする
   */
  layout(
    editorSetting: EditorSetting,
    renderer: PIXI.WebGLRenderer | PIXI.CanvasRenderer,
    graphics: PIXI.Graphics,
    measures: Measure[]
  ): void;

  getScrollOffsetY(
    editorSetting: EditorSetting,
    measure: Measure,
    position: number
  ): number;
}

export class DefaultMeasureLayout implements IMeasureLayout {
  name = "default";
  layout(
    editorSetting: EditorSetting,
    renderer: PIXI.WebGLRenderer | PIXI.CanvasRenderer,
    graphics: PIXI.Graphics,
    measures: Measure[]
  ) {
    // 縦に何個小節を配置するか
    const hC = editorSetting.verticalLaneCount;
    const padding = editorSetting.padding;
    const laneWidth = editorSetting.measureWidth;

    let index = 0;

    const w = renderer.width;
    const h = renderer.height;

    // レーンを描画
    draw_lane: for (var $x = 0; ; ++$x) {
      for (var i = hC - 1; i >= 0; --i) {
        var hh = (h - padding * 2) / hC;

        const x = padding + $x * (laneWidth + padding);
        const y = padding + hh * i;

        const measure = measures[index];

        // 画面内に表示されているか
        measure.isVisible = x + laneWidth > -graphics.x && x < -graphics.x + w;

        measure.x = x;
        measure.y = y;
        measure.width = laneWidth;
        measure.height = hh;

        if (++index >= measures.length) break draw_lane;
      }
    }
  }

  getScrollOffsetY(
    editorSetting: EditorSetting,
    measure: Measure,
    position: number
  ) {
    const hC = editorSetting.verticalLaneCount;
    const i = hC - 1 - (measure.index % hC);
    return (hC - 1 - i + position) / hC;
  }
}

export class GameMeasureLayout implements IMeasureLayout {
  name = "game";
  layout(
    editorSetting: EditorSetting,
    renderer: PIXI.WebGLRenderer | PIXI.CanvasRenderer,
    graphics: PIXI.Graphics,
    measures: Measure[]
  ) {
    const { measureWidth, measureHeight, padding } = editorSetting;

    const w = renderer.width;
    const h = renderer.height;

    // 小節の高さを計算する
    for (const measure of measures) {
      measure.height = measureHeight * Fraction.to01(measure.beat);
    }

    let y = h;
    let scrollOffset = 0;

    // 小節の位置を計算する
    for (const measure of measures) {
      measure.y = y - measure.height;

      if (measure.containsCurrentTime) {
        scrollOffset = y - h - measure.height * measure.currentTimePosition;
      }

      y -= measure.height;
    }

    for (const measure of measures) {
      measure.x = w / 2;
      measure.y -= scrollOffset + padding;
      measure.width = measureWidth;

      // 画面内に表示されているか
      measure.isVisible = measure.y + measure.height > 0 && measure.y < h;
    }
  }

  getScrollOffsetY(
    editorSetting: EditorSetting,
    measure: Measure,
    position: number
  ) {
    return 0.5;
  }
}
