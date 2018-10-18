import Pixi from "../Pixi";
import * as _ from "lodash";

export default class GraphicObject {
  isVisible = false;

  x = 0;
  y = 0;
  width = 0;
  height = 0;

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
}
