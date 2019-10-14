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
    this.measurePosition =
      current.measureIndex + Fraction.to01(current.measurePosition);
    this.unitTime = (240 / current.value) * Fraction.to01(current.beat);
    this.time = prev ? prev.getTime(this.measurePosition) : 0;
    this.bpm = current.value;
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
type BpmChangeAndBeat = OtherObjectData & {
  beat: IFraction;
};

export class TimeCalculator {
  data: BPMChangeData[] = [];
  constructor(data: OtherObject[], measures: Measure[]) {
    // 小節番号をキーにした BPM と拍子の変更命令マップ
    const bpmAndBeatMap = new Map<number, BpmChangeAndBeat>();

    // 小節の開始位置に配置されている BPM 変更命令に拍子情報を追加
    let bpmChanges = data
      .filter(object => object.isBPM())
      .map(bpmChange => {
        const bpmAndBeat = Object.assign(bpmChange, {
          beat: measures[bpmChange.measureIndex].beat
        }) as BpmChangeAndBeat;
        bpmAndBeatMap.set(bpmAndBeat.measureIndex, bpmAndBeat);
        return bpmAndBeat;
      });

    // 前の小節情報
    let prevBpm = 0;
    let prevBeat = Fraction.none as IFraction;

    for (let i = 0; i < measures.length; i++) {
      const newBpm = bpmAndBeatMap.has(i)
        ? bpmAndBeatMap.get(i)!
        : {
            type: 0,
            guid: guid(),
            measureIndex: i,
            measurePosition: new Fraction(0, 1),
            value: prevBpm,
            beat: measures[i].beat
          };

      // 前の小節と比較して BPM か拍子が変わっているなら命令を追加する
      if (
        (!(
          bpmAndBeatMap.has(i) &&
          bpmAndBeatMap.get(i)!.measurePosition.numerator === 0
        ) &&
          prevBpm !== newBpm.value) ||
        !Fraction.equal(prevBeat, newBpm.beat)
      ) {
        bpmChanges.push(newBpm);
      }

      prevBpm = newBpm.value;
      prevBeat = newBpm.beat;
    }

    // 同じ位置にBPM拍子変更命令が配置されないようにマップで管理する
    const bpmChangeMap = new Map<number, BpmChangeAndBeat>();
    for (const bpmChange of bpmChanges) {
      bpmChangeMap.set(
        bpmChange.measureIndex + Fraction.to01(bpmChange.measurePosition),
        bpmChange
      );
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
        bpmChangeMap.set(stop.getMeasurePosition(), Object.assign(
          _.cloneDeep(stop),
          {
            value: prevBpmAndBeat.value,
            beat: measures[stop.measureIndex].beat
          }
        ) as BpmChangeAndBeat);
      }
    }

    bpmChanges = [...bpmChangeMap.values()].sort(sortMeasure);

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
