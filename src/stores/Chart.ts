import { Howl } from "howler";
import { List, Record } from "immutable";
import * as _ from "lodash";
import { action, computed, observable } from "mobx";
import { Fraction } from "../math";
import {
  CustomTimeline,
  CustomTimelineData,
  CustomTimelineRecord
} from "../objects/CustomTimeline";
import { Lane } from "../objects/Lane";
import { LanePoint } from "../objects/LanePoint";
import { Layer, LayerData, LayerRecord } from "../objects/Layer";
import { MeasureRecord } from "../objects/Measure";
import { Note } from "../objects/Note";
import { OtherObjectData } from "../objects/OtherObject";
import {
  Timeline,
  TimelineData,
  TimelineJsonData,
  TimelineRecord
} from "../objects/Timeline";
import { guid } from "../utils/guid";
import HotReload from "../utils/HotReload";
import box from "../utils/mobx-box";
import Editor from "./EditorStore";
import MusicGameSystem from "./MusicGameSystem";

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
  // TODO: Record にする
  // data = new ChartRecord();

  version: number = 2;

  public timeline: Timeline;
  public customTimeline: CustomTimeline;

  @observable.shallow
  public layers: Layer[] = [];

  @observable
  currentLayerIndex = 0;

  customProps: any = {};

  @computed
  get currentLayer() {
    return this.layers[this.currentLayerIndex];
  }

  /**
   * 新規レイヤーを作成する
   */
  @action
  addLayer() {
    this.layers.splice(
      this.currentLayerIndex,
      0,
      LayerRecord.new({
        guid: guid(),
        name: `レイヤー${this.layers.length + 1}`,
        visible: true,
        lock: false
      })
    );

    this.layers = [...this.layers];
  }

  @action
  removeLayer() {
    // 削除対象のノートを列挙する
    const removeNotes = this.timeline.notes.filter(
      note => note.layer === this.currentLayer.guid
    );

    if (removeNotes.length) {
      // TODO: 専用のダイアログを作成する
      if (
        window.confirm(
          `${removeNotes.length} 個のノートが削除されます\nレイヤーを削除しますか？`
        )
      ) {
        // TODO: 一括削除する
        for (const note of removeNotes) {
          this.timeline.removeNote(note);
        }
      } else return;
    }

    this.layers = this.layers.filter(
      (_, index) => index !== this.currentLayerIndex
    );

    this.currentLayerIndex = Math.min(
      this.currentLayerIndex,
      this.layers.length - 1
    );
  }

  @action
  selectLayer(index: number) {
    this.currentLayerIndex = index;
  }

  @action
  toggleLayerVisible(index: number) {
    this.selectLayer(index);
    this.currentLayer.visible = !this.currentLayer.visible;
    this.layers = [...this.layers];
  }

  @action
  toggleLayerLock(index: number) {
    this.selectLayer(index);
    this.currentLayer.lock = !this.currentLayer.lock;
    this.layers = [...this.layers];
  }

  @action
  renameLayer(name: string) {
    this.currentLayer.name = name;
    this.layers = [...this.layers];
  }

  /**
   * レイヤーを結合する
   */
  @action
  mergeLayer() {
    // マージするノートを列挙する
    const mergeNotes = this.timeline.notes.filter(
      note => note.layer === this.currentLayer.guid
    );

    const nextLayer = this.layers[this.currentLayerIndex + 1];

    for (const note of mergeNotes) {
      note.layer = nextLayer.guid;
    }

    this.removeLayer();
  }

  @observable
  filePath: string | null = null;

  @observable
  canUndo = false;

  @observable
  canRedo = false;

  @action
  save() {
    this.timeline.save();
  }

  /**
   * JSON から譜面を読み込む
   * @param json JSON
   */
  public static loadFromJson(json: string) {
    const editor = Editor.instance!;

    const jsonChart: Chart = JSON.parse(json);

    const musicGameSystem = editor.asset.musicGameSystems.find(
      mgs => mgs.name === jsonChart.musicGameSystemName
    );

    if (!musicGameSystem) {
      return console.error(
        "MusicGameSystem が見つかりません",
        jsonChart.musicGameSystemName,
        jsonChart.musicGameSystemVersion
      );
    }
    if (musicGameSystem.version !== jsonChart.musicGameSystemVersion) {
      // TODO: 更新処理を実装する
      editor.notify(
        `${musicGameSystem.name} のバージョンが異なります`,
        "warning"
      );
    }

    const chart = editor.newChart(musicGameSystem, jsonChart.audioSource!);
    chart.load(json);
    editor.setCurrentChart(editor.charts.length - 1);
  }

  /**
   * 小節を生成する
   * @param index 小節番号
   */
  private createMeasure(index: number) {
    const customProps = this.musicGameSystem.measure.customProps.reduce(
      (object: any, customProps) => {
        object[customProps.key] = customProps.defaultValue;
        return object;
      },
      {}
    );

    return MeasureRecord.new(
      {
        index,
        beat: new Fraction(4, 4),
        customProps
      },
      this.musicGameSystem.measure
    );
  }

  @action
  load(json: string) {
    const chartData = JSON.parse(json);
    console.log("譜面を読み込みます", chartData);

    const timelineData: TimelineJsonData = chartData.timeline;

    chartData.version = chartData.version | 0;
    if (chartData.version < this.version) {
      console.warn("譜面フォーマットをアップデートします。");
    }

    // BPM変更と速度変更をOtherObjectsに統合
    if (chartData.version === 0) {
      timelineData.otherObjects = chartData.timeline.bpmChanges.map(
        (object: any) => {
          object.type = 0;
          object.value = object.bpm;
          return object as OtherObjectData;
        }
      );
      chartData.timeline.speedChanges.map((object: any) => {
        object.type = 1;
        object.value = object.speed;
        timelineData.otherObjects.push(object as OtherObjectData);
      });
      console.log(timelineData.otherObjects);
    }

    // 譜面のカスタムオプションを読み込む
    (() => {
      const data = chartData.customProps || {};

      const newProps: any = {};
      for (const prop of this.musicGameSystem.customProps) {
        if (prop.key in data) {
          newProps[prop.key] = data[prop.key];
        } else {
          newProps[prop.key] = prop.defaultValue;
        }
      }

      this.customProps = newProps;
    })();

    // 初期レーンのguidを固定
    if (chartData.version <= 1) {
      for (let i = 0; i < this.musicGameSystem.initialLanes.length; i++) {
        const guid = "initialLane" + i;
        const oldGuid = chartData.timeline.lanes[i].guid;
        chartData.timeline.lanes[i].guid = guid;
        for (const note of chartData.timeline.notes) {
          if (note.lane == oldGuid) {
            note.lane = guid;
          }
        }
      }
      // 以前コピペされたゴミデータを削除
      const layers = chartData.layers.map((lane: any) => lane.guid);
      layers.push(undefined);
      const lanes = chartData.timeline.lanes.map((lane: any) => lane.guid);
      chartData.timeline.notes = chartData.timeline.notes.filter(
        (note: any) => layers.includes(note.layer) && lanes.includes(note.lane)
      );
    }

    // 1000 小節まで生成する
    for (let i = timelineData.measures.length; i <= 999; i++) {
      timelineData.measures.push({
        index: i,
        beat: new Fraction(4, 4),
        customProps: {}
      });
    }

    // 小節のカスタムプロパティを生成する
    for (const [index, measure] of timelineData.measures.entries()) {
      measure.customProps = Object.assign(
        this.createMeasure(index).customProps,
        measure.customProps
      );
    }

    this.timeline = TimelineRecord.new(this, timelineData as TimelineData);
    this.customTimeline = CustomTimelineRecord.new(
      this,
      chartData.customTimeline as CustomTimelineData
    );

    const layers = (chartData.layers || []) as LayerData[];

    // 譜面にレイヤー情報がなければ初期レイヤーを生成する
    if (layers.length === 0) {
      layers.push({
        guid: guid(),
        name: "レイヤー1",
        visible: true,
        lock: false
      });
      // 全ノートを初期レイヤーに割り当てる
      for (const note of this.timeline.notes) {
        note.layer = layers[0].guid;
      }
    }

    this.layers = layers.map(layer => LayerRecord.new(layer));

    this.setName(chartData.name);
    this.setStartTime(chartData.startTime);
    this.setDifficulty(chartData.difficulty || 0);
  }

  /**
   * コンストラクタ
   * @param musicGameSystem
   * @param audioSource
   */
  public constructor(musicGameSystem: MusicGameSystem, audioSource: string) {
    this.timeline = TimelineRecord.new(this);
    this.customTimeline = CustomTimelineRecord.new(this);
    this.musicGameSystem = musicGameSystem;
    this.setAudioFromSource(audioSource);
  }

  @observable
  name: string = "新規譜面";

  @action
  setName = (name: string) => (this.name = name);

  @observable
  difficulty: number = 0;

  @action
  setDifficulty(difficulty: number) {
    this.difficulty = difficulty;
  }

  @box
  public musicGameSystem: MusicGameSystem;

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
  seVolume: number = 1.0;

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

  @action
  setSeVolume(value: number) {
    this.seVolume = value;
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

    if (seek) this.audio!.seek(time);
  };

  @action
  async setAudioFromSource(source: string) {
    const audioBuffer = Editor.instance!.asset.loadAudioAsset(source);
    if (audioBuffer) this.setAudio(audioBuffer, source);
  }

  updateTime() {
    if (!this.audio) return;
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
          MeasureRecord.new(
            {
              index,
              beat: new Fraction(4, 4),
              customProps: {}
            },
            this.musicGameSystem.measure
          )
        )
    );
  }

  /**
   * 初期レーンを読み込む
   */
  @action
  loadInitialLanes() {
    const musicGameSystem = this.musicGameSystem;

    musicGameSystem.initialLanes.forEach((initialLane, index) => {
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
        guid: "initialLane" + index,
        templateName: laneTemplate.name,
        division: laneTemplate.division,
        points: lanePoints
      } as Lane;
      this.timeline.addLane(newLane);
    });
  }

  @action
  toJSON(): string {
    if (!this.musicGameSystem) return "{}";

    // 最終小節のインデックスを取得
    const audioDuration = this.audio!.duration() - this.startTime;
    const lastMeasureIndex = this.timeline.measures.findIndex(
      measure => measure.endTime >= audioDuration
    );

    let chart = Object.assign({}, this);

    delete chart.filePath;
    delete chart.audio;
    delete chart.audioBuffer;
    delete chart.isPlaying;
    delete chart.volume;
    delete (chart as any)._musicGameSystem;
    delete chart.musicGameSystem;
    delete chart.currentLayerIndex;
    delete chart.canRedo;
    delete chart.canUndo;

    chart.musicGameSystemName = this.musicGameSystem.name;
    chart.musicGameSystemVersion = this.musicGameSystem.version;

    chart.timeline = TimelineRecord.newnew(this, chart.timeline.toJS());

    delete chart.time;

    chart.timeline.measures = chart.timeline.measures.slice(
      0,
      lastMeasureIndex
    );

    delete (chart as any)._musicGameSystem;

    chart = JSON.parse(JSON.stringify(chart));
    const deleteConfigKey = (obj: any) => {
      for (const key of Object.keys(obj)) {
        if (key == "inspectorConfig") delete obj[key];
        else if (obj[key] instanceof Object) deleteConfigKey(obj[key]);
      }
    };
    deleteConfigKey(chart);

    return JSON.stringify(chart, null, 2);
  }
}
