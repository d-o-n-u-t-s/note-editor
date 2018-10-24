import TimelineObject from "./TimelineObject";

import { GUID } from "../util";
import { Fraction } from "../math";
import Pixi from "../containers/Pixi";
import Measure from "./Measure";
import { Graphics } from "pixi.js";

enum Types {
  Integer,
  Float,
  Boolean,
  Fraction
}

interface IChronoObject {
  guid: GUID;

  /**
   * 小節インデックス
   */
  measureIndex: number;
  /**
   * 小節内の位置
   */
  measurePosition: Fraction;
}

export default interface BPMChange extends IChronoObject {
  bpm: number;
}

class _BPMRenderer {
  getBounds(bpmChange: BPMChange, measure: Measure): PIXI.Rectangle {
    const lane = measure;

    const y =
      lane.y +
      lane.height -
      (lane.height / bpmChange.measurePosition!.denominator) *
        bpmChange.measurePosition!.numerator;

    const colliderH = 20;

    // this.width = w;
    //this.height = colliderH;
    const _x = measure.x;
    const _y = y - colliderH / 2;

    return new PIXI.Rectangle(_x, _y, measure.width, colliderH);
  }

  render(bpm: BPMChange, graphics: PIXI.Graphics, measure: Measure) {
    const bounds = this.getBounds(bpm, measure);

    graphics
      .lineStyle(0)
      .beginFill(0xff0000)
      .drawRect(bounds.x, bounds.y, bounds.width, bounds.height)
      .endFill();

    Pixi.instance!.drawTempText(
      `bpm: ${bpm.bpm}`,
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2
    );
  }
}

export const BPMRenderer = new _BPMRenderer();

class BPMChangeData {
  measurePosition: number;
  unitTime: number;
  time: number;

  constructor(current: BPMChange, prev: BPMChangeData) {
    this.measurePosition =
      current.measureIndex + current.measurePosition.to01Number();
    this.unitTime = 240 / current.bpm;
    this.time = prev ? prev.getTime(this.measurePosition) : 0;
  }

  getTime(measurePosition: number) {
    return this.time + (measurePosition - this.measurePosition) * this.unitTime;
  }
}

export class TimeCalculator {
  data: BPMChangeData[] = [];
  constructor(data: BPMChange[]) {
    for (let i = 0; i < data.length; i++) {
      this.data.push(new BPMChangeData(data[i], this.data[i - 1]));
    }
  }

  getTime(measurePosition: number) {
    for (var i = this.data.length - 1; ; i--) {
      if (this.data[i].measurePosition <= measurePosition) {
        return this.data[i].getTime(measurePosition);
      }
    }
  }
}