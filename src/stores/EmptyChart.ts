import MusicGameSystem, {
  CustomNoteLineRenderer,
  HowlPool,
  LaneTemplate,
  NoteType
} from "../stores/MusicGameSystem";

/**
 * 空の譜面
 */
export interface IEmptyChart {
  timeline: {
    undo: () => void;
    redo: () => void;
  };
  musicGameSystem: MusicGameSystem;
  canUndo: boolean;
  canRedo: boolean;
}

/**
 * 空の譜面情報
 */
export const emptyChart = {
  timeline: {
    undo() {},
    redo() {}
  },
  musicGameSystem: {
    name: "",
    version: 0,
    difficulties: [],
    laneTemplates: [],
    laneTemplateMap: new Map<string, LaneTemplate>(),
    initialLanes: [],
    measureHorizontalDivision: 0,
    noteTypes: [],
    otherObjectTypes: [],
    seMap: new Map<string, HowlPool>(),
    noteTypeMap: new Map<string, NoteType>(),
    customNoteLineRenderers: [],
    customNoteLineRendererMap: new Map<string, CustomNoteLineRenderer>(),
    measure: {
      renderer: "",
      rendererReference: null,
      customProps: []
    },
    customProps: [],
    eventListener: null,
    eventListeners: {}
  },
  canUndo: false,
  canRedo: false
};
