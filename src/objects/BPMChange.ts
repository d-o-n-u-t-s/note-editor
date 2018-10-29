import { GUID, guid } from "../util";
import { Fraction, IFraction } from "../math";
import Pixi from "../containers/Pixi";
import Measure, { sortMeasure } from "./Measure";

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

export default interface IBPMChange extends IChronoObject {
  bpm: number;
}

class _BPMRenderer {
  getBounds(bpmChange: IBPMChange, measure: Measure): PIXI.Rectangle {
    const lane = measure;

    const y =
      lane.y +
      lane.height -
      (lane.height / bpmChange.measurePosition!.denominator) *
        bpmChange.measurePosition!.numerator;

    const colliderH = 20;

    const _x = measure.x;
    const _y = y - colliderH / 2;

    return new PIXI.Rectangle(_x, _y, measure.width, colliderH);
  }

  render(bpm: IBPMChange, graphics: PIXI.Graphics, measure: Measure) {
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

  constructor(current: IBPMChangeAndBeat, prev: BPMChangeData) {
    this.measurePosition =
      current.measureIndex + Fraction.to01(current.measurePosition);
    this.unitTime = (240 / current.bpm) * Fraction.to01(current.beat);
    this.time = prev ? prev.getTime(this.measurePosition) : 0;
  }

  getTime(measurePosition: number) {
    return this.time + (measurePosition - this.measurePosition) * this.unitTime;
  }
}

/**
 * BPM 変更命令 + 拍子
 */
interface IBPMChangeAndBeat extends IBPMChange {
  beat: IFraction;
}

export class TimeCalculator {
  data: BPMChangeData[] = [];
  constructor(data: IBPMChange[], measures: Measure[]) {
    // 小節番号をキーにした BPM と拍子の変更命令マップ
    const bpmAndBeatMap = new Map<number, IBPMChangeAndBeat>();

    // 小節の開始位置に配置されている BPM 変更命令に拍子情報を追加
    let bpmChanges = data
      .map(bpmChange => {
        const bpmAndBeat = Object.assign(
          {
            beat: measures[bpmChange.measureIndex].data.beat
          },
          bpmChange
        ) as IBPMChangeAndBeat;
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
            guid: guid(),
            measureIndex: i,
            measurePosition: new Fraction(0, 1),
            bpm: prevBpm,
            beat: measures[i].data.beat
          };

      // 前の小節と比較して BPM か拍子が変わっているなら命令を追加する
      if (
        (!(
          bpmAndBeatMap.has(i) &&
          bpmAndBeatMap.get(i)!.measurePosition.numerator === 0
        ) &&
          prevBpm !== newBpm.bpm) ||
        !Fraction.equal(prevBeat, newBpm.beat)
      ) {
        bpmChanges.push(newBpm);
      }

      prevBpm = newBpm.bpm;
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
