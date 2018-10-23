import { Fraction } from "../math";
import TimelineObject from "./TimelineObject";
import { LaneTemplate } from "../stores/MusicGameSystem";
import Pixi from "../containers/Pixi";
import LanePoint from "./LanePoint";
import Measure from "./Measure";

class LanePointRenderer {
  getBounds(lanePoint: LanePoint, measure: Measure): PIXI.Rectangle {
    const lane = measure;

    //    math.fraction(0, 0)

    const w =
      (measure.width / lanePoint.horizontalPosition!.denominator) *
      lanePoint.horizontalSize;

    const x =
      lane.x +
      (measure.width / lanePoint.horizontalPosition!.denominator) *
        lanePoint.horizontalPosition!.numerator;

    const y =
      lane.y +
      lane.height -
      (lane.height / lanePoint.measurePosition!.denominator) *
        lanePoint.measurePosition!.numerator;

    const colliderH = 20;

    // this.width = w;
    //this.height = colliderH;
    const _x = x;
    const _y = y - colliderH / 2;

    return new PIXI.Rectangle(_x, _y, w, colliderH);
  }

  render(lanePoint: LanePoint, graphics: PIXI.Graphics, measure: Measure) {
    const bounds = this.getBounds(lanePoint, measure);

    graphics
      .lineStyle(4, lanePoint.color, 1)
      .moveTo(bounds.x, bounds.y + bounds.height / 2)
      .lineTo(bounds.x + bounds.width, bounds.y + bounds.height / 2);

    return;

    Pixi.instance!.drawTempText(
      `${lanePoint.measureIndex}:${lanePoint.measurePosition}`,
      bounds.x,
      bounds.y,
      {
        fontSize: 16
      }
    );
  }
}

export default new LanePointRenderer();
