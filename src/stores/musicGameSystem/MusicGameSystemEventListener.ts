import { Note } from "src/objects/Note";
import { GuiUtility } from "../../utils/GuiUtility";
import Chart from "../Chart";

type MusicGameSystemEventListener = {
  onSave?: (chart: Chart) => string;
  onRenderInspector?: (chart: Chart, util: GuiUtility) => void;
  getGroup?: (note: Note) => string;
};

export default MusicGameSystemEventListener;
