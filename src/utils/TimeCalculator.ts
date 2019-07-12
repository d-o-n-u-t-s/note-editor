import { Fraction, IFraction } from "../math";
import { guid } from "./guid";
import { Measure, sortMeasure } from "../objects/Measure";
import {
  OtherObject,
  OtherObjectData,
  OtherObjectType
} from "../objects/OtherObject";

class BPMChangeData {
  measurePosition: number;
  unitTime: number;
  time: number;

  constructor(current: IBPMChangeAndBeat, prev: BPMChangeData) {
    this.measurePosition =
      current.measureIndex + Fraction.to01(current.measurePosition);
    this.unitTime = (240 / current.value) * Fraction.to01(current.beat);
    this.time = prev ? prev.getTime(this.measurePosition) : 0;
  }

  getTime(measurePosition: number) {
    return this.time + (measurePosition - this.measurePosition) * this.unitTime;
  }
}

/**
 * BPM 変更命令 + 拍子
 */
interface IBPMChangeAndBeat extends OtherObjectData {
  beat: IFraction;
}

export class TimeCalculator {
  data: BPMChangeData[] = [];
  constructor(data: OtherObject[], measures: Measure[]) {
    // 小節番号をキーにした BPM と拍子の変更命令マップ
    const bpmAndBeatMap = new Map<number, IBPMChangeAndBeat>();

    // 小節の開始位置に配置されている BPM 変更命令に拍子情報を追加
    let bpmChanges = data
      .filter(object => object.isBPM())
      .map(bpmChange => {
        const bpmAndBeat = Object.assign(bpmChange, {
          beat: measures[bpmChange.measureIndex].beat
        }) as IBPMChangeAndBeat;
        bpmAndBeatMap.set(bpmAndBeat.measureIndex, bpmAndBeat);

        return bpmAndBeat;
      })
      .sort(sortMeasure);

    // 前の小節情報
    let prevBpm = 0;
    let prevBeat = Fraction.none as IFraction;

    for (let i = 0; i < measures.length; i++) {
      const newBpm = bpmAndBeatMap.has(i)
        ? bpmAndBeatMap.get(i)!
        : {
            type: OtherObjectType.BPM,
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
    bpmChanges = bpmChanges.sort(sortMeasure);

    for (let i = 0; i < bpmChanges.length; i++) {
      this.data.push(new BPMChangeData(bpmChanges[i], this.data[i - 1]));
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
