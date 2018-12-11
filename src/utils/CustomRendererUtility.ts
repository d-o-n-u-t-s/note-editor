import { drawQuad, drawTriangle } from "./drawQuad";

const __require = (window as any).require;

const fs = __require("fs");
const util = __require("util");

import * as PIXI from "pixi.js";
import Pixi from "../containers/Pixi";

import { Vector2, lerp, inverseLerp } from "../math";
import { defaultRender } from "../objects/NoteRenderer";

import store from "../stores/stores";
import { Note } from "../objects/Note";
import Editor from "../stores/EditorStore";

const textures = new Map<string, PIXI.Texture>();

const loading = new Map<string, boolean>();

async function getImage(imagePath: string) {
  if (loading.has(imagePath)) return;

  loading.set(imagePath, true);

  const path = await store.editor.asset.getAssetPath;
  const buffer: Buffer = await util.promisify(fs.readFile)(
    path.mgsp + "/" + imagePath
  );

  var blob = new Blob([buffer], { type: "image/jpg" });
  const p = URL.createObjectURL(blob);

  // a.set(imagePath, p);

  var texture = PIXI.Texture.fromImage(p);

  textures.set(imagePath, texture);

  //  console.warn(texture);
}

const spriteMap = new WeakMap<any, PIXI.Sprite>();

const sprites: PIXI.Sprite[] = [];

class CustomRendererUtility {
  currentFrame = 0;

  update(currentFrame: number) {
    this.currentFrame = currentFrame;
    this.Pixi = Pixi.instance;

    for (const sprite of sprites) sprite.visible = false;
  }

  get is3D() {
    return Editor.instance!.setting.preserve3D;
  }

  drawLine(
    graphics: PIXI.Graphics,
    p1: Vector2,
    p2: Vector2,
    lineWidth: number,
    color: number,
    alpha: number = 1
  ) {
    graphics
      .lineStyle(lineWidth, color, alpha)
      .moveTo(p1.x, p1.y)
      .lineTo(p2.x, p2.y);
  }

  drawQuad = drawQuad;
  drawTriangle = drawTriangle;

  Vector2 = Vector2;
  lerp = lerp;
  inverseLerp = inverseLerp;
  Pixi: any;
  defaultNoteRender = defaultRender;

  *getHead(
    note: Note,
    callback: (note: Note) => boolean
  ): IterableIterator<Note> {
    const chart = store.editor.currentChart;

    if (!chart) return;

    var prevNote = note;

    while (true) {
      // 対象ノートを末尾に持っているノートライン
      var nl = chart.timeline.noteLines.find(
        noteLine => noteLine.tail === prevNote.guid
      );

      if (!nl) return;

      yield (prevNote = chart.timeline.noteMap.get(nl.head)!);
    }
  }
  *getTail(
    note: Note,
    callback: (note: Note) => boolean
  ): IterableIterator<Note> {
    const chart = store.editor.currentChart;
    if (!chart) return;
    let prevNote = note;

    let debugCount = 0;

    while (true) {
      // 対象ノートを先頭に持っているノートライン
      const nl = chart.timeline.noteLines.find(
        noteLine => noteLine.head === prevNote.guid
      );
      if (!nl) return;

      // 無限ループチェック
      if (debugCount++ > 10000) throw note;

      yield (prevNote = chart.timeline.noteMap.get(nl.tail)!);
    }
  }

  getSprite(target: any, imagePath: string): PIXI.Sprite | null {
    getImage(imagePath);

    if (!textures.has(imagePath)) return null;

    if (spriteMap.has(target)) {
      const sprite = spriteMap.get(target)!;
      sprite.visible = true;

      return sprite;
    }
    const sprite = new PIXI.Sprite(textures.get(imagePath));

    Pixi.debugGraphics!.addChild(sprite);

    sprite.visible = true;

    spriteMap.set(target, sprite);

    sprites.push(sprite);

    return sprite;
  }
}

export default new CustomRendererUtility();
