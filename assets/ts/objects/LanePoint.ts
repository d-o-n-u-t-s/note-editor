import { Fraction } from "../math";
import TimelineObject from "./TimelineObject";
import { LaneTemplate } from "../stores/MusicGameSystem";
import Pixi from "../Pixi";

/**
 * レーンの中間点
 */
export default interface LanePoint extends TimelineObject {
  horizontalSize: number;
  horizontalPosition: Fraction;

  templateName: string;

  color: number; // = 0xffffff;
}
