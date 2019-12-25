import * as fs from "fs";
import { Fraction, inverseLerp, lerp, Vector2 } from "../math";
import { NoteRecord } from "../objects/Note";
import Editor from "../stores/EditorStore";
import { guid } from "../utils/guid";

export class ExtensionUtility {
  Vector2 = Vector2;
  lerp = lerp;
  inverseLerp = inverseLerp;
  NoteRecord = NoteRecord;
  guid = guid;
  Fraction = Fraction;
  fs = fs;
  getEditor() {
    return Editor.instance!;
  }
}

export default new ExtensionUtility();
