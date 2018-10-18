import * as _ from "lodash";
import { Fraction, IFraction } from "../math";
import GraphicObject from "./GraphicObject";

export interface IMeasureEditorProps {
  time: number;
}

export interface IMeasureData {
  index: number;
  beat: IFraction;
  editorProps: IMeasureEditorProps;
  customProps: any;
}

/**
 * 小節内の位置
 */
interface MeasurePoint {
  x: number;
}

/**
 * 小節
 */
export default class Measure extends GraphicObject {
  constructor(public data: IMeasureData) {
    super();
  }
}

interface MeasureObject {
  measureIndex: number;
  measurePosition: IFraction;
}
interface MeasureDataObject {
  data: {
    measureIndex: number;
    measurePosition: IFraction;
  };
}

export function sortMeasure(a: MeasureObject, b: MeasureObject) {
  const v1 = a.measureIndex + Fraction.to01(a.measurePosition);
  const v2 = b.measureIndex + Fraction.to01(b.measurePosition);

  return v1 - v2;
}

export function sortMeasureData(a: MeasureDataObject, b: MeasureDataObject) {
  const v1 = a.data.measureIndex + Fraction.to01(a.data.measurePosition);
  const v2 = b.data.measureIndex + Fraction.to01(b.data.measurePosition);

  return v1 - v2;
}
