import { action, observable } from "mobx";

/**
 * 編集モード
 */
export enum EditMode {
  Select = 1,
  Add,
  Delete,
  Connect
}

/**
 *
 */
export enum ObjectCategory {
  // ノート
  Note = 1,
  // レーン
  Lane,
  // 特殊
  Other
}

export enum OtherObjectType {
  BPM = 1,
  Stop,
  Speed = 3,
  BarLine
}

export interface ObjectVisibility {
  lanePoint: boolean;
}

export default class EditorSetting {
  /**
   * テーマ（仮）
   * TODO: 専用クラスを作る
   */
  theme: {
    targetMeasureBorderWidth: number;
    targetMeasureBorderColor: number;
    targetMeasureBorderAlpha: number;
  } = {
    targetMeasureBorderWidth: 4,
    targetMeasureBorderColor: 0x00ff00,
    targetMeasureBorderAlpha: 0.5
  };

  @observable
  customPropColor = "#ff0000";

  @action
  setCustomPropColor(color: string) {
    this.customPropColor = color;
  }

  @observable
  editMode = EditMode.Select;
  @action
  setEditMode = (value: EditMode) => (this.editMode = value);

  @observable
  objectVisibility: ObjectVisibility = {
    lanePoint: true
  };

  @action
  setObjectVisibility(objectVisibility: any) {
    this.objectVisibility = Object.assign(
      this.objectVisibility,
      objectVisibility
    );
  }

  @observable
  editObjectCategory = ObjectCategory.Note;
  @action
  setEditObjectCategory = (value: ObjectCategory) =>
    (this.editObjectCategory = value);

  @observable
  editNoteTypeIndex = 0;

  @action
  setEditNoteTypeIndex = (value: number) => (this.editNoteTypeIndex = value);

  @observable
  editLaneTypeIndex = 0;

  @action
  setEditLaneTypeIndex = (value: number) => (this.editLaneTypeIndex = value);

  @observable
  editOtherTypeIndex = 0;

  @action
  setEditOtherTypeIndex(value: number) {
    this.editOtherTypeIndex = value;
  }

  @observable
  laneWidth = 300;

  @action
  setLaneWidth(newLaneWidth: number) {
    this.laneWidth = newLaneWidth;
  }
  @observable
  verticalLaneCount = 3;

  @action
  setVerticalLaneCount = (value: number) => (this.verticalLaneCount = value);

  @observable
  padding: number = 20;

  @action
  setPadding = (value: number) => (this.padding = value);

  /**
   * 1 小節の分割数
   */
  @observable
  measureDivision: number = 4;

  @action
  setMeasureDivision = (value: number) => (this.measureDivision = value);

  static readonly MEASURE_DIVISIONS = [
    1,
    2,
    3,
    4,
    6,
    8,
    12,
    16,
    24,
    32,
    48,
    64
  ];

  /**
   * 配置するオブジェクトのサイズ
   */
  @observable
  objectSize: number = 1;

  @action
  setObjectSize = (value: number) => (this.objectSize = value);

  @observable
  bpm = 120;

  @action
  setBpm(bpm: number) {
    this.bpm = bpm;
  }
  @observable
  speed = 1.0;

  @action
  setSpeed(speed: number) {
    this.speed = speed;
  }
}
