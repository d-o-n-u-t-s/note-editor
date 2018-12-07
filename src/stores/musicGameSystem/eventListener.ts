import { GUI } from "dat-gui";
import { GuiUtility } from "../../utils/GuiUtility";
import Chart from "../Chart";

export default interface IMusicGameSystemEventListener {
  onSave?: (chart: Chart) => void;
  onRenderInspector?: (gui: GUI, util: GuiUtility) => void;
}
