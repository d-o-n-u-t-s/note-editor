import { Howl } from "howler";
import { List, Record } from "immutable";
import * as _ from "lodash";
import { action, computed, observable, transaction } from "mobx";
import { Fraction } from "../math";
import { Lane } from "../objects/Lane";
import { LanePoint } from "../objects/LanePoint";
import { Measure, MeasureData, MeasureRecord } from "../objects/Measure";
import { Note } from "../objects/Note";
import {
  Timeline,
  TimelineRecord,
  TimelineData,
  TimelineJsonData
} from "../objects/Timeline";
import { guid } from "../util";
import HotReload from "../utils/HotReload";
import Editor from "./EditorStore";
import MusicGameSystem, {
  IMusicGameSystemMeasureCustomProps
} from "./MusicGameSystem";

type ChartData = {
  name: string;

  editorVersion: number;

  musicGameSystem: {
    name: string;
    version: number;
  };

  audio: {
    source: string;
    startTime: number;
  };

  timeline: {
    notes: List<Note>;
  };
};

class ChartRecord extends Record<ChartData>({
  name: "新規譜面",
  editorVersion: 1,
  musicGameSystem: {
    name: "string",
    version: 1
  },

  audio: {
    source: "string",
    startTime: 0
  },

  timeline: {
    notes: List<Note>()
  }
}) {}

export default class Chart {
  data = new ChartRecord();

  timeline: Timeline;

  @observable
  filePath: string | null = null;

  static fromJSON(json: string) {
    const editor = Editor.instance!;

    const jsonChart: Chart = JSON.parse(json);

    const musicGameSystem = editor.asset.musicGameSystems.find(
      mgs =>
        mgs.name === jsonChart.musicGameSystemName &&
        mgs.version === jsonChart.musicGameSystemVersion
    );

    if (!musicGameSystem) {
      return console.error(
        "MusicGameSystem が見つかりません",
        jsonChart.musicGameSystemName,
        jsonChart.musicGameSystemVersion
      );
    }

    const audioPath = editor.asset.audioAssetPaths.find(aap =>
      aap.endsWith(jsonChart.audioSource!)
    );

    if (!audioPath) {
      return console.error("音源が見つかりません", jsonChart.audioSource);
    }

    const chart = editor.newChart(musicGameSystem, audioPath);
    chart.load(json);
    editor.setCurrentChart(editor.charts.length - 1);
  }

  /**
   * 小節を生成する
   * @param index 小節番号
   */
  private createMeasure(index: number) {
    const customProps = this.musicGameSystem!.measure.customProps.reduce(
      (object: any, customProps: IMusicGameSystemMeasureCustomProps) => {
        object[customProps.key] = customProps.defaultValue;
        // object[Symbol(`_${customProps.key}_items`)] = customProps.items;
        return object;
      },
      {}
    );

    return MeasureRecord.new({
      index,
      beat: new Fraction(4, 4),
      editorProps: { time: 0 },
      customProps
    });
  }

  @action
  load(json: string) {
    const chartData = JSON.parse(json);
    console.log("譜面を読み込みます", chartData);

    const timelineData: TimelineJsonData = chartData.timeline;

    // 1000 小節まで生成する
    for (let i = timelineData.measures.length; i <= 999; i++) {
      timelineData.measures.push({
        index: i,
        beat: new Fraction(4, 4),
        editorProps: { time: 0 },
        customProps: {}
      });
    }

    // 小節のカスタムプロパティを生成する
    for (const [index, measure] of timelineData.measures.entries()) {
      measure.customProps = Object.assign(
        this.createMeasure(index).data.customProps,
        measure.customProps
      );
    }

    this.timeline = TimelineRecord.new(this, timelineData as TimelineData);

    this.setName(chartData.name);
    this.setStartTime(chartData.startTime);

    /*
    transaction(() => {
      const measures: Measure[] = [];

      // 小節を読み込む
      for (const measureData of (chart.timeline.measures ||
        []) as MeasureData[]) {
        const measure = MeasureRecord.new(measureData);
        measures.push(measure);
      }

      // 1000 小節まで生成する
      for (let i = measures.length; i <= 999; i++) {
        measures.push(
          MeasureRecord.new({
            index: i,
            beat: new Fraction(4, 4),
            editorProps: { time: 0 },
            customProps: {}
          })
        );
      }

      // HACK: テスト
      for (const [index, measure] of measures.entries()) {
        measure.data.customProps = Object.assign(
          this.createMeasure(index).data.customProps,
          measure.data.customProps
        );
      }

      this.timeline.setMeasures(measures);

      for (const lanePoint of chart.timeline.lanePoints) {
        lanePoint.measurePosition = new Fraction(
          lanePoint.measurePosition.numerator,
          lanePoint.measurePosition.denominator
        );
        lanePoint.horizontalPosition = new Fraction(
          lanePoint.horizontalPosition.numerator,
          lanePoint.horizontalPosition.denominator
        );

        this.timeline.addLanePoint(lanePoint);
      }

      this.timeline.$initializeLanes(timeline.lanes);
      this.timeline.$initializeNotes(chart.timeline.notes, this);
      this.timeline.$initializeNoteLines(chart.timeline.noteLines, this);
      

      this.timeline.save();


      for (const bpmChange of chart.timeline.bpmChanges) {
        bpmChange.measurePosition = new Fraction(
          bpmChange.measurePosition.numerator,
          bpmChange.measurePosition.denominator
        );
        this.timeline.addBPMChange(bpmChange);
      }

      for (const speedChange of chart.timeline.speedChanges) {
        speedChange.measurePosition = new Fraction(
          speedChange.measurePosition.numerator,
          speedChange.measurePosition.denominator
        );
        this.timeline.addSpeedChange(speedChange);
      }
    });
    */
  }

  constructor(musicGameSystem: MusicGameSystem, audioSource: string) {
    this.timeline = TimelineRecord.new(this);

    console.log(this.timeline);

    this.setMusicGameSystem(musicGameSystem);
    this.setAudioFromSource(audioSource);

    console.log("譜面を生成しました", musicGameSystem, audioSource);
  }

  @observable
  name: string = "新規譜面";

  @action
  setName = (name: string) => (this.name = name);

  @observable
  musicGameSystem?: MusicGameSystem;

  @action
  setMusicGameSystem = (value: MusicGameSystem) =>
    (this.musicGameSystem = value);

  @observable
  audio?: Howl;

  @observable
  audioSource?: string;

  @observable
  audioBuffer?: AudioBuffer;

  @observable
  volume: number = 1.0;

  @observable
  speed: number = 1.0;

  @observable
  startTime: number = 0.0;

  @action
  setStartTime(startTime: number) {
    this.startTime = startTime;
  }

  @action
  setVolume(value: number) {
    this.volume = value;
    this.audio!.volume(value);
  }

  @action
  setSpeed(value: number) {
    this.speed = value;
    this.audio!.rate(value);
  }

  @computed
  get normalizedPosition() {
    return this.time / this.audio!.duration();
  }

  @action
  private setAudioBuffer(ab: AudioBuffer) {
    this.audioBuffer = ab;
  }

  @action
  resetAudio() {
    delete this.audio;
    delete this.audioBuffer;
    delete this.audioSource;
  }

  @observable
  isPlaying: boolean = false;

  @action
  private setIsPlaying = (value: boolean) => (this.isPlaying = value);

  @action
  pause() {
    if (!this.audio) return;
    this.audio!.pause();

    this.isPlaying = false;
  }

  @action
  play(volume: number = 0.5) {
    if (!this.audio) return;

    this.isPlaying = true;

    if ((window as any).ps) (window as any).ps.stop();
    (window as any).ps = this.audio;

    this.audio!.seek(this.time);
    this.audio!.rate(this.speed);

    this.audio!.play();
  }

  // 現在時刻
  // ※ setTime か updateTime を呼ばないと更新されない
  @observable
  time: number = 0;

  @action
  setTime = (time: number, seek: boolean = false) => {
    this.time = _.clamp(time, 0, this.audio!.duration());

    //    console.log("change time", time);

    if (seek) this.audio!.seek(time); //, this.playId);
  };

  @action
  async setAudioFromSource(source: string) {
    const audioBuffer = await Editor.instance!.asset.loadAudioAsset(source);
    this.setAudio(audioBuffer, source);
  }

  updateTime() {
    const time = this.audio!.seek() as number;
    if (this.time !== time) this.setTime(time);
  }

  @action
  setAudio(buffer: Buffer, source: string) {
    const extension = source.split(".").pop()!;

    const blob = new Blob([buffer], { type: `audio/${extension}` });
    const src = URL.createObjectURL(blob);

    // 既に楽曲が存在したら
    if (this.audio) {
      this.audio.off("end");
    }

    this.audio = new Howl({ src, format: [extension] });

    this.audio.on("end", () => this.setIsPlaying(false));

    // 秒数リセット
    this.setTime(0);
    this.isPlaying = false;

    this.audioSource = source;

    if ((window as any).ps) (window as any).ps.stop();

    var context: AudioContext = (this.audio as any)._sounds[0]._node.context;

    const self = this;

    HotReload.override(
      context,
      "decodeAudioData",
      async (base: any, ...args: any[]) => {
        const audioBuffer = await base(...args);

        console.warn("loaded", audioBuffer);

        self.setAudioBuffer(audioBuffer);

        return audioBuffer;
      }
    );
  }

  private musicGameSystemName = "";
  private musicGameSystemVersion = 0;

  /**
   * 初期小節を読み込む
   */
  @action
  loadInitialMeasures() {
    this.timeline.setMeasures(
      Array(1000)
        .fill(0)
        .map((_, index) =>
          MeasureRecord.new({
            index,
            beat: new Fraction(4, 4),
            editorProps: { time: 0 },
            customProps: {}
          })
        )
    );
  }

  /**
   * 初期レーンを読み込む
   */
  @action
  loadInitialLanes() {
    console.log("loadInitialLane!");

    const musicGameSystem = this.musicGameSystem!;

    for (const initialLane of musicGameSystem.initialLanes) {
      const laneTemplate = musicGameSystem.laneTemplateMap.get(
        initialLane.template
      )!;

      const lanePoints = Array.from({ length: 2 }).map((_, index) => {
        const newLanePoint = {
          measureIndex: index * 300,
          measurePosition: new Fraction(0, 1),
          guid: guid(),
          color: Number(laneTemplate.color),
          horizontalSize: initialLane.horizontalSize,
          templateName: laneTemplate.name,
          horizontalPosition: new Fraction(
            initialLane.horizontalPosition,
            musicGameSystem.measureHorizontalDivision
          )
        } as LanePoint;

        this.timeline.addLanePoint(newLanePoint);

        return newLanePoint.guid;
      });

      const newLane = {
        guid: guid(),
        templateName: laneTemplate.name,
        division: laneTemplate.division,
        points: lanePoints
      } as Lane;
      this.timeline.addLane(newLane);
    }
  }

  @action
  toJSON(): string {
    if (!this.musicGameSystem) return "{}";

    const chart = Object.assign({}, this);

    delete chart.filePath;
    delete chart.audio;
    delete chart.audioBuffer;
    delete chart.isPlaying;
    delete chart.volume;
    delete chart.musicGameSystem;

    chart.musicGameSystemName = this.musicGameSystem!.name;
    chart.musicGameSystemVersion = this.musicGameSystem!.version;

    chart.audioSource = (chart.audioSource || "").split("/").pop();

    //  const tl = (chart.timeline = Object.assign({}, chart.timeline));

    //console.log(tl);

    chart.timeline = TimelineRecord.newnew(this, chart.timeline.toJS());

    delete chart.time;

    chart.timeline.measures = chart.timeline.measures.slice(0, 1000);

    const json = JSON.stringify(chart);

    return json;
  }
}
