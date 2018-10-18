import { Howl } from "howler";
import * as _ from "lodash";
import { action, observable, computed, transaction } from "mobx";
import { Fraction } from "../math";
import MusicGameSystem, {
  IMusicGameSystemMeasure,
  IMusicGameSystemMeasureCustomProps
} from "./MusicGameSystem";

interface IStore {}

import Timeline from "../objects/Timeline";
import Editor from "./EditorStore";
import Lane from "../objects/Lane";
import LanePoint from "../objects/LanePoint";
import { guid } from "../util";
import Note, { INoteData } from "../objects/Note";
import Measure, { IMeasureData } from "../objects/Measure";
import HotReload from "../utils/HotReload";

export default class Chart implements IStore {
  @observable
  timeline: Timeline;

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

    return new Measure({
      index,
      beat: new Fraction(4, 4),
      editorProps: { time: 0 },
      customProps
    });
  }

  @action
  load(json: string) {
    const chart = JSON.parse(json);
    console.log("譜面を読み込みます", chart);

    this.setName(chart.name);
    this.setStartTime(chart.startTime);
    transaction(() => {
      const measures: Measure[] = [];

      // 小節を読み込む
      for (const measureData of (chart.timeline.measures ||
        []) as IMeasureData[]) {
        const measure = new Measure(measureData);
        measures.push(measure);
      }

      // 1000 小節まで生成する
      for (let i = measures.length; i <= 999; i++) {
        measures.push(
          new Measure({
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

      const notes: any[] = [];

      // 小節を読み込む
      for (const measureData of (chart.timeline.measures ||
        []) as IMeasureData[]) {
        const measure = new Measure(measureData);
        measures.push(measure);
      }

      for (const noteData of chart.timeline.notes as INoteData[]) {
        const note = new Note(noteData);

        if (!note.data.customProps)
          note.data.customProps = { color: "#ffffff" };

        note.data.editorProps = {
          color: Number(
            this.musicGameSystem!.noteTypeMap.get(note.data.type)!.editorProps
              .color
          ),
          time: 0,
          sePlayed: false
        };

        notes.push(note);
      }
      this.timeline.addNotes(notes);

      for (const noteLine of chart.timeline.noteLines) {
        this.timeline.addNoteLine(noteLine);
      }

      this.timeline.setLanes(chart.timeline.lanes);

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
  }

  constructor(musicGameSystem: MusicGameSystem, audioSource: string) {
    this.timeline = new Timeline();

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

    this.audio!.play();
  }

  private observeTimeId: number | null = null;

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

  @action
  setAudio(buffer: Buffer, source: string) {
    // BinaryString, UintXXArray, ArrayBuffer -> Blob
    const blob = new Blob([buffer], { type: "audio/wav" });

    const src = URL.createObjectURL(blob);

    console.warn(src);

    // 既に楽曲が存在したら
    if (this.audio) {
      this.audio.off("end");
    }
    if (this.observeTimeId !== null) {
      window.clearInterval(this.observeTimeId);
    }

    this.audio = new Howl({ src: src, format: ["wav"] });

    this.audio.on("end", () => this.setIsPlaying(false));

    // 秒数リセット
    this.setTime(0);
    this.isPlaying = false;

    // 毎フレーム再生秒数を監視する
    this.observeTimeId = window.setInterval(() => {
      const time = this.audio!.seek() as number;

      if (this.time !== time) this.setTime(time);
    }, 1000 / 60);

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
        .map(
          (_, index) =>
            new Measure({
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

    delete chart.audio;
    delete chart.audioBuffer;
    delete chart.isPlaying;
    delete chart.observeTimeId;
    delete chart.volume;
    delete chart.musicGameSystem;

    chart.musicGameSystemName = this.musicGameSystem!.name;
    chart.musicGameSystemVersion = this.musicGameSystem!.version;

    chart.audioSource = (chart.audioSource || "").split("/").pop();

    const tl = (chart.timeline = Object.assign({}, chart.timeline));

    console.log(tl);

    tl.bpmChanges.replace(
      chart.timeline.bpmChanges.map(t => Object.assign({}, t))
    );
    tl.lanePoints = chart.timeline.lanePoints.map(t => Object.assign({}, t));
    (tl as any).lanes = chart.timeline.lanes.map(t => Object.assign({}, t));
    (tl as any).notes = chart.timeline.notes.map(note => {
      return note.data;
    });

    (tl as any).measures = chart.timeline.measures.map(measure => {
      return measure.data;
    });

    //  for (const e of tl.bpmChanges) delete e.renderer;
    // for (const e of tl.notes) delete e.renderer;

    delete chart.time;
    //delete chart.timeline;

    //console.log(chart);

    const json = JSON.stringify(chart, null, 2);

    //    localStorage.setItem("chart", json);

    return json;
  }
}
