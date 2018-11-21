import { Record } from "immutable";
import * as _ from "lodash";
import Pixi from "../containers/Pixi";
import { Fraction, IFraction } from "../math";
import { Mutable } from "../utils/mutable";

export interface IMeasureEditorProps {
  time: number;
}

export interface IMeasureCustomProps {
  [key: string]: {
    defaultValue: any;
    items: string[] | null;
  };
}

export type MeasureData = {
  index: number;
  beat: IFraction;
  editorProps: IMeasureEditorProps;
  customProps: any;
};

const defaultMeasureData: MeasureData = {
  index: -1,
  beat: Fraction.none,
  editorProps: { time: 0 },
  customProps: {}
};

export type Measure = Mutable<MeasureRecord>;

/**
 * 小節
 */
export class MeasureRecord extends Record<MeasureData>(defaultMeasureData) {
  static new(data: MeasureData): Measure {
    const measure = new MeasureRecord(data);
    return Object.assign(measure, measure.asMutable());
  }

  private constructor(data: MeasureData) {
    super(data);
  }

  isVisible = false;

  x = 0;
  y = 0;
  width = 0;
  height = 0;

  containsPoint(point: { x: number; y: number }) {
    return (
      _.inRange(point.x, this.x, this.x + this.width) &&
      _.inRange(point.y, this.y, this.y + this.height)
    );
  }

  getBounds() {
    return new PIXI.Rectangle(
      this.x + Pixi.debugGraphics!.x,

      this.y,
      this.width,
      this.height
    );
  }
}

interface MeasureObject {
  measureIndex: number;
  measurePosition: IFraction;
}
interface MeasureDataObject {
  measureIndex: number;
  measurePosition: IFraction;
}

export function sortMeasure(a: MeasureObject, b: MeasureObject) {
  const v1 = a.measureIndex + Fraction.to01(a.measurePosition);
  const v2 = b.measureIndex + Fraction.to01(b.measurePosition);

  return v1 - v2;
}

export function sortMeasureData(a: MeasureDataObject, b: MeasureDataObject) {
  const v1 = a.measureIndex + Fraction.to01(a.measurePosition);
  const v2 = b.measureIndex + Fraction.to01(b.measurePosition);

  return v1 - v2;
}
