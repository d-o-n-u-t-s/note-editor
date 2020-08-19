import * as _ from "lodash";
import { Fraction, IFraction } from "../math";
import { Measure, sortMeasure } from "../objects/Measure";
import { OtherObject, OtherObjectData } from "../objects/OtherObject";
import { guid } from "./guid";

class BPMChangeData {
  private readonly unitTime: number;
  private readonly time: number;
  private stopTime: number;
  public readonly bpm: number;
  public readonly measurePosition: number;

  /**
   * コンストラクタ
   * @param current 現在のBPM拍子変更情報
   * @param prev 直前のBPM拍子変更情報
   * @param stops 停止情報
   */
  constructor(
    current: BpmChangeAndBeat,
    prev: BPMChangeData,
    stops: OtherObject[]
  ) {
    this.measurePosition = current.measurePosition;
    this.unitTime = (240 / current.bpm) * Fraction.to01(current.beat);
    this.time = prev ? prev.getTime(this.measurePosition) : 0;
    this.bpm = current.bpm;
    this.stopTime = 0;

    // 停止時間を計算する
    // TODO: stops全てを見ないように最適化できそう
    for (const stop of stops) {
      const measurePosition = stop.getMeasurePosition();

      // 直前のBPM変更と現在のBPM変更の間に配置されている停止命令を探す
      if (
        (prev ? prev.measurePosition : 0) <= measurePosition &&
        this.measurePosition > measurePosition
      ) {
        const bpm = prev.bpm;
        // NOTE: 停止時間は192分音符を基準にする
        this.stopTime += (240 / bpm) * ((1 / 192) * stop.value);
      }
    }
  }

  /**
   * 小節位置の再生時間を取得する
   * @param measurePosition 小節位置
   */
  public getTime(measurePosition: number) {
    return (
      this.time +
      this.stopTime +
      (measurePosition - this.measurePosition) * this.unitTime
    );
  }
}

/**
 * BPM 変更命令 + 拍子
 */
type BpmChangeAndBeat = {
  beat: IFraction;
  bpm: number;
  measurePosition: number;
};

export class TimeCalculator {
  data: BPMChangeData[] = [];
  constructor(data: OtherObject[], measures: Measure[]) {
    // BPM 変更命令に拍子情報を追加
    let bpmChanges = data
      .filter(object => object.isBPM())
      .map(bpmChange => ({
        beat: measures[bpmChange.measureIndex].beat,
        bpm: bpmChange.value,
        measurePosition: bpmChange.getMeasurePosition()
      }));

    // 拍子変更対応
    let index = 0;
    for (let i = 0; i < measures.length; i++) {
      // 直前の BPM 変更を取得
      while (
        index + 1 < bpmChanges.length &&
        bpmChanges[index + 1].measurePosition <= i
      )
        index++;
      const prev = bpmChanges[index];

      // 拍子が変わっているか
      if (Fraction.equal(prev.beat, measures[i].beat)) continue;

      // 小節の頭なら上書き
      if (prev.measurePosition == i) {
        prev.beat = measures[i].beat;
        continue;
      }
      // それ以外は追加
      bpmChanges.splice(index + 1, 0, {
        beat: measures[i].beat,
        bpm: prev.bpm,
        measurePosition: i
      });
    }

    // 同じ位置にBPM拍子変更命令が配置されないようにマップで管理する
    const bpmChangeMap = new Map<number, BpmChangeAndBeat>();
    for (const bpmChange of bpmChanges) {
      bpmChangeMap.set(bpmChange.measurePosition, bpmChange);
    }

    // 一時停止の位置にBPM拍子変更命令がなければ複製して配置する
    const stops = data.filter(object => object.isStop());
    for (const stop of stops) {
      if (!bpmChangeMap.has(stop.getMeasurePosition())) {
        // 一時停止命令の直前にある BPM 変更命令を探す
        const prevKey = Math.max(
          ...[...bpmChangeMap.keys()].filter(
            measurePosition => measurePosition <= stop.getMeasurePosition()
          )
        );
        const prevBpmAndBeat = bpmChangeMap.get(prevKey)!;
        bpmChangeMap.set(stop.getMeasurePosition(), {
          beat: measures[stop.measureIndex].beat,
          bpm: prevBpmAndBeat.bpm,
          measurePosition: stop.getMeasurePosition()
        });
      }
    }

    bpmChanges = [...bpmChangeMap.values()].sort(
      (a, b) => a.measurePosition - b.measurePosition
    );

    for (let i = 0; i < bpmChanges.length; i++) {
      this.data.push(new BPMChangeData(bpmChanges[i], this.data[i - 1], stops));
    }
  }

  /**
   * 小節位置の再生時間を取得する
   * @param measurePosition 小節位置
   */
  getTime(measurePosition: number) {
    for (let i = this.data.length - 1; ; i--) {
      if (this.data[i].measurePosition <= measurePosition) {
        return this.data[i].getTime(measurePosition);
      }
    }
  }

  /**
   * 小節位置のBPMを取得する
   * @param measurePosition 小節位置
   */
  getBpm(measurePosition: number) {
    for (let i = this.data.length - 1; ; i--) {
      if (this.data[i].measurePosition <= measurePosition) {
        return this.data[i].bpm;
      }
    }
  }
}
