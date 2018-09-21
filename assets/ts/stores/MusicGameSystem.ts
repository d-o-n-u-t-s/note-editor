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
  color: string;
  renderer: string;
  rendererReference: any;
  excludeLanes: string[];
}

interface CustomNoteLineRenderer {
  target: string;
  renderer: string;
  rendererReference: any;
}

interface MusicGameSystem {
  name: string;
  version: number;
  laneTemplates: LaneTemplate[];
  initialLanes: InitialLane[];
  measureHorizontalDivision: number;
  noteTypes: NoteType[];
  customNoteLineRenderers: CustomNoteLineRenderer[];
}

export function normalizeMusicGameSystem(
  musicGameSystem: any
): MusicGameSystem {
  return Object.assign(
    {
      initialLanes: [],
      customNoteLineRenderers: []
    },
    musicGameSystem
  );
}

export default MusicGameSystem;
