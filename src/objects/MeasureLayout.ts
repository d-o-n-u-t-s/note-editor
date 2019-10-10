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

  getScrollOffsetY(y: number, measure: Measure, measures: Measure[]): number;
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

    const baseHeight = (renderer.height - padding * 2) / hC;

    let x = padding;
    let y = renderer.height - padding;

    // レーンを描画
    for (const measure of measures) {
      measure.width = laneWidth;
      measure.height = baseHeight * Fraction.to01(measure.beat);
      y -= measure.height;
      // 収まりきらないなら次の列へ
      if (y < 0) {
        x += laneWidth + padding;
        y = renderer.height - padding - measure.height;
      }
      measure.x = x;
      measure.y = y;

      // 画面内に表示されているか
      measure.isVisible =
        x + laneWidth > -graphics.x && x < -graphics.x + renderer.width;
    }
  }

  getScrollOffsetY(y: number, measure: Measure, measures: Measure[]) {
    measures = measures.filter(m => m.x == measure.x);
    const top = measures[measures.length - 1].y;
    return (y - top) / (measures[0].y + measures[0].height - top);
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

  getScrollOffsetY(y: number, measure: Measure, measures: Measure[]) {
    return 0.5;
  }
}
