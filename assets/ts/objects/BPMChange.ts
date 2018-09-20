import TimelineObject from "./TimelineObject";

export default class BPMChange extends TimelineObject {
  bpm: number = -1;

  renderer: BPMRenderer | null = null;
}

export class BPMRenderer extends PIXI.Sprite {
  text: PIXI.Text;

  constructor(public target: BPMChange) {
    super();

    this.text = new PIXI.Text("aa", {
      fill: 0xffffff,

      dropShadow: true,
      dropShadowBlur: 8,
      dropShadowColor: "#000000",
      dropShadowDistance: 0,

      fontSize: 16,
      align: "center"
      //textBaseline: "middle"
    });

    this.text.anchor.set(0.5);

    this.addChild(this.text);
  }
  update(graphics: PIXI.Graphics, measure: PIXI.Container) {
    const bpm = this.target;
    const lane = measure;

    this.text.text = "BPM " + this.target.bpm;

    const x = lane.x;
    const y =
      lane.y +
      lane.height -
      (lane.height / bpm.measurePosition!.denominator) *
        bpm.measurePosition!.numerator;

    this.text.x = x + measure.width / 2;
    this.text.y = y;

    graphics
      .lineStyle(4, 0x00ff00)
      .moveTo(x, y)
      .lineTo(x + lane.width, y);
  }
}
