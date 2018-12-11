import { GuiUtility } from "../../utils/GuiUtility";
import Chart from "../Chart";

export default interface IMusicGameSystemEventListener {
  onSave?: (chart: Chart) => void;
  onRenderInspector?: (chart: Chart, util: GuiUtility) => void;
}
