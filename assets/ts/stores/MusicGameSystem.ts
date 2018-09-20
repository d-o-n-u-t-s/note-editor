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

interface MusicGameSystem {
  name: string;
  laneTemplates: LaneTemplate[];
  initialLanes: InitialLane[];
  measureHorizontalDivision: number;
  noteTypes: { name: string; color: string; renderer: string }[];
}

export default MusicGameSystem;
