import { Record } from "immutable";
import { Mutable } from "src/utils/mutable";
import { GUID, guid } from "../utils/guid";

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
    return new NoteLineRecord(data).asMutable();
  }

  private constructor(data: NoteLineData) {
    super(
      (() => {
        if (data.guid === "") data.guid = guid();
        return data;
      })()
    );
  }

  isVisible = false;

  x = 0;
  y = 0;
  width = 0;
  height = 0;
}
