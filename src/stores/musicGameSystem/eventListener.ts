import { Note } from "../../objects/Note";
import { GuiUtility } from "../../utils/GuiUtility";
import Chart from "../Chart";

interface IMusicGameSystemEventListenerNoteInformation {
  sortedNoteTypeGroups: [string, Note[]][];
  getClipboardText: () => string;
}

export default interface IMusicGameSystemEventListener {
  onSave?: (chart: Chart) => string;
  onSerialize?: (chart: Chart) => string;
  onRenderInspector?: (chart: Chart, util: GuiUtility) => void;
  getGroup?: (note: Note, chart: Chart) => string;
  getNoteInformation?: (
    groups: [string, Note[]][]
  ) => IMusicGameSystemEventListenerNoteInformation;
}
