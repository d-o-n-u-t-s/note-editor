import { Record } from "immutable";
import * as _ from "lodash";
import { Mutable } from "src/utils/mutable";
import Pixi from "../containers/Pixi";
import { Fraction, IFraction } from "../math";
import Chart from "../stores/Chart";
import { GUID } from "../util";

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

export type Note = Mutable<NoteRecord>;

export class NoteRecord extends Record<NoteData>(defaultNoteData) {
  static new(data: NoteData, chart: Chart): Note {
    const note = new NoteRecord(data, chart);
    return Object.assign(note, note.asMutable());
  }

  isVisible = false;

  x = 0;
  y = 0;
  width = 0;
  height = 0;

  getMeasurePosition() {
    return this.measureIndex + Fraction.to01(this.measurePosition);
  }

  containsPoint(point: { x: number; y: number }) {
    return (
      _.inRange(point.x, this.x, this.x + this.width) &&
      _.inRange(point.y, this.y, this.y + this.height)
    );
  }

  getBounds() {
    return new PIXI.Rectangle(
      this.x + Pixi.debugGraphics!.x,

      this.y,
      this.width,
      this.height
    );
  }

  private constructor(data: NoteData, chart: Chart) {
    super(
      (() => {
        const noteType = chart.musicGameSystem!.noteTypeMap.get(data.type)!;

        if (!noteType) {
          console.log(data);
        }

        // 不要カスタムプロパティの削除と新規カスタムプロパティの追加
        const newProps: any = {
          inspectorConfig: noteType.customPropsInspectorConfig
        };
        for (const prop of noteType.customProps) {
          if (prop.key in data.customProps) {
            newProps[prop.key] = data.customProps[prop.key];
          } else if (
            typeof prop.defaultValue !== "string" ||
            prop.defaultValue.indexOf("return") === -1
          ) {
            newProps[prop.key] = prop.defaultValue;
          } else {
            newProps[prop.key] = new Function(
              "chart",
              "data",
              prop.defaultValue
            )(chart, data);
          }
        }

        data.customProps = newProps;

        if (noteType.editorProps.color === "$laneColor") {
          data.editorProps.color = Number(
            chart.musicGameSystem!.laneTemplateMap.get(
              chart.timeline.laneMap.get(data.lane)!.templateName
            )!.color
          );
        } else {
          data.editorProps.color = Number(noteType.editorProps.color);
        }

        return data;
      })()
    );
  }
}
