import { Howl } from "howler";
import { action, observable, computed } from "mobx";

import HotReload from "../HotReload";

import { Fraction } from "../math";

import * as PIXI from "pixi.js";
import MusicGameSystem from "./MusicGameSystem";

interface IStore {}

import Timeline from "../objects/Timeline";
import BPMChange, { BPMRenderer } from "../objects/BPMChange";
import LanePointRenderer from "../objects/LanePoint";

import NoteRenderer from "../objects/NoteRenderer";

export default class Chart implements IStore {
  @observable
  timeline: Timeline;

  load(json: string) {
    const chart = JSON.parse(json);
    console.log("Load!", chart);

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

    for (const note of chart.timeline.notes) {
      note.measurePosition = new Fraction(
        note.measurePosition.numerator,
        note.measurePosition.denominator
      );
      note.horizontalPosition = new Fraction(
        note.horizontalPosition.numerator,
        note.horizontalPosition.denominator
      );

      //  note.renderer = new NoteRenderer(note);
      this.timeline.addNote(note);
    }

    for (const noteLine of chart.timeline.noteLines) {
      this.timeline.addNoteLine(noteLine);
    }

    for (const lane of chart.timeline.lanes) {
      /*
      lane.measurePosition = new Fraction(
        lane.measurePosition.numerator,
        lane.measurePosition.denominator
      );
      /*
      lane.horizontalPosition = new Fraction(
        lane.horizontalPosition.numerator,
        lane.horizontalPosition.denominator
      );
      */
    }
    this.timeline.setLanes(chart.timeline.lanes);
  }

  constructor(src: string) {
    this.timeline = new Timeline();

    {
      const bpmChange = {
        bpm: 120,
        measureIndex: 0,
        measurePosition: new Fraction(0, 1)
      } as BPMChange;

      bpmChange.renderer = new BPMRenderer(bpmChange);

      this.timeline.bpmChanges.push(bpmChange);
    }

    {
      /*
      const aa = {
        measureIndex: 1,
        measurePosition: math.fraction(0, 1) as math.Fraction
      } as LanePoint;

      aa.renderer = new LanePointRenderer(aa);

      this.timeline.lanePoints.push(aa);
      */
    }

    {
      const bpmChange = {
        bpm: 240,
        measureIndex: 4,
        measurePosition: new Fraction(0, 1)
      } as BPMChange;

      bpmChange.renderer = new BPMRenderer(bpmChange);

      this.timeline.bpmChanges.push(bpmChange);
    }
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
    function clamp(num: number, min: number, max: number) {
      return num <= min ? min : num >= max ? max : num;
    }

    this.time = clamp(time, 0, this.audio!.duration());

    //    console.log("change time", time);

    if (seek) this.audio!.seek(time); //, this.playId);
  };

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

  toJSON(): string {
    const chart = Object.assign({}, this);

    delete chart.audio;
    delete chart.audioBuffer;
    delete chart.musicGameSystem;

    const tl = (chart.timeline = Object.assign({}, chart.timeline));

    tl.bpmChanges = chart.timeline.bpmChanges.map(t => Object.assign({}, t));
    tl.lanePoints = chart.timeline.lanePoints.map(t => Object.assign({}, t));
    tl.lanes = chart.timeline.lanes.map(t => Object.assign({}, t));
    tl.notes = chart.timeline.notes.map(t => Object.assign({}, t));

    for (const e of tl.bpmChanges) delete e.renderer;
    // for (const e of tl.notes) delete e.renderer;

    delete chart.time;
    //delete chart.timeline;

    //console.log(chart);

    const json = JSON.stringify(chart, null, 2);

    //    localStorage.setItem("chart", json);

    return json;
    return "1";
  }
}
