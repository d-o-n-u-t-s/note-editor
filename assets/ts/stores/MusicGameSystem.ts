export interface LaneTemplate {
  name: string;
  color: string;
  division: number;
  renderer: string;
  rendererReference: Function;
}

/**
 * 初期レーン情報
 */
interface InitialLane {
  template: string;
  horizontalSize: number;
  horizontalPosition: number;
}

export interface NoteType {
  name: string;
  renderer: string;
  rendererReference: any;
  excludeLanes: string[];

  connectableTypes: string[];

  /**
   * カスタムプロパティ
   */
  customProps: { key: string; defaultValue: any }[];

  /**
   * エディタプロパティ
   */
  editorProps: {
    color: string;
  };
}

export interface CustomNoteLineRenderer {
  target: string;
  renderer: string;
  rendererReference: any;
}

interface MusicGameSystem {
  name: string;
  version: number;
  laneTemplates: LaneTemplate[];

  laneTemplateMap: Map<string, LaneTemplate>;

  initialLanes: InitialLane[];
  measureHorizontalDivision: number;
  noteTypes: NoteType[];

  noteTypeMap: Map<string, NoteType>;

  customNoteLineRenderers: CustomNoteLineRenderer[];

  customNoteLineRendererMap: Map<string, CustomNoteLineRenderer>;
}
/**
 * 音ゲーシステムを正規化して不正な値を修正する
 * @param musicGameSystem システム
 */
export function normalizeMusicGameSystem(
  musicGameSystem: any
): MusicGameSystem {
  const system: MusicGameSystem = Object.assign(
    {
      initialLanes: [],
      laneTemplates: [],
      customNoteLineRenderers: [],
      customProps: [],
      editorProps: [],
      noteTypes: []
    },
    musicGameSystem
  );

  for (const noteType of system.noteTypes) {
    noteType.editorProps = Object.assign(
      {
        color: "0xffffff"
      },
      noteType.editorProps
    );
    noteType.connectableTypes = noteType.connectableTypes || [];
  }

  return system;
}

export default MusicGameSystem;
