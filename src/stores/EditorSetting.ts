import * as _ from "lodash";
import { action, computed, observable, observe } from "mobx";
import { verifyNumber } from "../math";
import {
  DefaultMeasureLayout,
  GameMeasureLayout,
  IMeasureLayout,
} from "../objects/MeasureLayout";
import box from "../utils/mobx-box";

/**
 * 編集モード
 */
export enum EditMode {
  Select = 1,
  Add,
  Delete,
  Connect,
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
  Other,
}

/**
 * 譜面タブのラベル
 */
export enum ChartTabLabelType {
  Name,
  FilePath,
}

export interface ObjectVisibility {
  lanePoint: boolean;
}

export default class EditorSetting {
  constructor() {
    this.load();
    observe(this, () => {
      const setting = _.clone(this);
      // 保存してはいけないプロパティを削除する
      delete setting.measureLayouts;
      localStorage.setItem("editorSetting", JSON.stringify(setting));
    });
  }

  /**
   * エディタ設定を読み込む
   */
  @action
  load() {
    const editorSetting = localStorage.getItem("editorSetting");
    if (editorSetting) {
      _.merge(this, JSON.parse(editorSetting));
    }
  }

  /**
   * テーマ（仮）
   * TODO: 専用クラスを作る
   */
  public theme = {
    hover: 0xff990099,
    selected: 0xff9900ff,
  };

  /**
   * material-ui のテーマ
   */
  @observable
  public muiThemeType: "light" | "dark" = "light";

  /**
   * material-ui のテーマを切り替える
   */
  @action
  public toggleMuiTheme() {
    this.muiThemeType = this.muiThemeType === "light" ? "dark" : "light";
  }

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
    lanePoint: true,
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
  measureWidth = 300;

  @action
  setMeasureWidth(value: number) {
    this.measureWidth = value;
  }

  @observable
  measureHeight = 300;

  @action
  setMeasureHeight(value: number) {
    this.measureHeight = value;
  }

  @observable
  verticalLaneCount = 3;

  @action
  setVerticalLaneCount = (value: number) =>
    (this.verticalLaneCount = verifyNumber(value, 1));

  @observable
  padding: number = 40;

  @action
  setPadding = (value: number) => (this.padding = value);

  @observable
  reverseScroll = false;

  @action
  setReverseScroll(value: boolean) {
    this.reverseScroll = value;
  }

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
    64,
    96,
    128,
    192,
  ];

  /**
   * 配置するオブジェクトのサイズ
   */
  @observable
  objectSize: number = 1;

  @action
  setObjectSize = (value: number) => (this.objectSize = value);

  @observable
  otherValue = 120;

  @action
  setOtherValue(value: number) {
    this.otherValue = value;
  }

  measureLayouts: IMeasureLayout[] = [
    new DefaultMeasureLayout(),
    new GameMeasureLayout(),
  ];

  @observable
  currentMeasureLayoutIndex = 0;

  @action
  setCurrentMeasureLayoutIndex(index: number) {
    this.currentMeasureLayoutIndex = index;
  }

  @computed
  get measureLayout() {
    return this.measureLayouts[this.currentMeasureLayoutIndex];
  }

  @observable
  preserve3D = false;

  @observable
  rotateX = 10;

  @observable
  scale3D = 2;

  @observable
  perspective = 150;

  @action
  set3D(enabled: boolean, rotate: number, scale: number, perspective: number) {
    this.preserve3D = enabled;
    this.rotateX = rotate;
    this.scale3D = scale;
    this.perspective = perspective;
  }

  @box
  public tabLabelType = ChartTabLabelType.Name;

  @box
  public tabHeight = 0;
}
