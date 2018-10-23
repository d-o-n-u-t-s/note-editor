import { Fraction, IFraction } from "../math";
import GraphicObject from "./GraphicObject";
import { GUID } from "../util";
import { observable } from "mobx";
import Chart from "../stores/Chart";

interface INoteEditorProps {
  time: number;

  color: number;
  sePlayed: boolean;
}

export interface INoteData {
  editorProps: INoteEditorProps;

  guid: GUID;

  /**
   * 小節インデックス
   */
  measureIndex: number;
  /**
   * 小節内の位置
   */
  measurePosition: IFraction;

  horizontalSize: number;
  horizontalPosition: Fraction;

  type: string;

  /**
   * 所属レーンの GUID
   */
  lane: GUID;

  customProps: any;
}

export default class Note extends GraphicObject {
  @observable
  data: INoteData;

  constructor(data: INoteData, chart: Chart) {
    super();
    this.data = data;
    const noteType = chart.musicGameSystem!.noteTypeMap.get(data.type)!;

    // 不要カスタムプロパティの削除と新規カスタムプロパティの追加
    const newProps: any = {};
    for (const prop of noteType.customProps) {
      if (prop.key in data.customProps) {
        newProps[prop.key] = data.customProps[prop.key];
      } else if (
        typeof prop.defaultValue !== "string" ||
        prop.defaultValue.indexOf("return") === -1
      ) {
        newProps[prop.key] = prop.defaultValue;
      } else {
        newProps[prop.key] = new Function("chart", "data", prop.defaultValue)(
          chart,
          data
        );
      }
    }
    this.data.customProps = newProps;

    // editorProps.color
    if (noteType.editorProps.color === "$laneColor") {
      this.data.editorProps.color = Number(
        chart.musicGameSystem!.laneTemplateMap.get(
          chart.timeline.laneMap.get(data.lane)!.templateName
        )!.color
      );
    } else {
      this.data.editorProps.color = Number(noteType.editorProps.color);
    }
  }
}
