import { inverseLerp, lerp, Vector2, Fraction } from "../math";
import { NoteRecord } from "../objects/Note";
import { guid } from "../util";

class ExtensionUtility {
  Vector2 = Vector2;
  lerp = lerp;
  inverseLerp = inverseLerp;
  NoteRecord = NoteRecord;
  guid = guid;
  Fraction = Fraction;
}

export default new ExtensionUtility();
