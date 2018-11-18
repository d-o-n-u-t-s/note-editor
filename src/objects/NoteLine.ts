import { Record } from "immutable";
import { Mutable } from "src/utils/mutable";
import { GUID } from "../util";

export type NoteLineData = {
  guid: GUID;
  head: GUID;
  tail: GUID;
};

const defaultNoteLineData: NoteLineData = {
  guid: "GUID",
  head: "GUID",
  tail: "GUID"
};

export type NoteLine = Mutable<NoteLineRecord>;

export class NoteLineRecord extends Record<NoteLineData>(defaultNoteLineData) {
  static new(data: NoteLineData): NoteLine {
    return new NoteLineRecord(data.head, data.tail).asMutable();
  }

  private constructor(head: GUID, tail: GUID) {
    super({ head, tail, guid: "" });
  }

  isVisible = false;

  x = 0;
  y = 0;
  width = 0;
  height = 0;

  get data() {
    return this;
  }
}
