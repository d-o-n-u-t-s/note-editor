import { drawQuad } from "./drawQuad";

const __require = (window as any).require;

const fs = __require("fs");
const util = __require("util");

import * as PIXI from "pixi.js";
import Pixi from "../containers/Pixi";

import { Vector2, lerp } from "../math";
import { defaultRender } from "../objects/NoteRenderer";

import store from "../stores/stores";

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

  drawQuad = drawQuad;
  Vector2 = Vector2;
  lerp = lerp;
  Pixi: any;
  defaultNoteRender = defaultRender;

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
