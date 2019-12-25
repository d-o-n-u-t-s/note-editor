import { GuiUtility } from "../../utils/GuiUtility";
import Chart from "../Chart";
import { Note } from "src/objects/Note";

export default interface IMusicGameSystemEventListener {
  onSave?: (chart: Chart) => string;
  onSerialize?: (chart: Chart) => string;
  onRenderInspector?: (chart: Chart, util: GuiUtility) => void;
  getGroup?: (note: Note, chart: Chart) => string;
}
