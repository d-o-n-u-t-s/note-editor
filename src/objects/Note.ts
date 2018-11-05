import { Fraction, IFraction } from "../math";
import Chart from "../stores/Chart";
import { GUID } from "../util";
import GraphicObject from "./GraphicObject";
import { Record } from "immutable";

interface INoteEditorProps {
  time: number;

  color: number;
  sePlayed: boolean;
}

export type NoteData = {
  guid: GUID;
  editorProps: INoteEditorProps;

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
};

const defaultNoteData: NoteData = {
  guid: "GUID",
  editorProps: {
    time: 1,
    color: 0,
    sePlayed: false
  },
  measureIndex: -1,
  measurePosition: new Fraction(0, 1),

  horizontalSize: 1,
  horizontalPosition: Fraction.none,

  type: "string",

  /**
   * 所属レーンの GUID
   */
  lane: "GUID",

  customProps: {}
};

export class NoteRecord extends Record<NoteData>(defaultNoteData) {
  c = false;
}

export default class Note extends GraphicObject {
  data: NoteRecord;

  constructor(data: NoteData, chart: Chart) {
    super();

    const noteType = chart.musicGameSystem!.noteTypeMap.get(data.type)!;

    if (!noteType) {
      console.log(data);
    }

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

    this.data = new NoteRecord(
      Object.assign(data, {
        customProps: newProps
      })
    );

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
