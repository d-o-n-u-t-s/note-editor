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
  S
}

export default class EditorSetting {
  @observable
  editMode = EditMode.Select;
  @action
  setEditMode = (value: EditMode) => (this.editMode = value);

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
  laneWidth = 400;

  @action
  setLaneWidth(newLaneWidth: number) {
    this.laneWidth = newLaneWidth;
  }
  @observable
  verticalLaneCount = 2;

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

  /**
   * 配置するオブジェクトのサイズ
   */
  @observable
  objectSize: number = 1;

  @action
  setObjectSize = (value: number) => (this.objectSize = value);
}
