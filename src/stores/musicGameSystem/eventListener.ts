import { CustomTimelineItem } from "../../objects/CustomTimelineItem";
import { Note } from "../../objects/Note";
import { GuiUtility } from "../../utils/GuiUtility";
import Chart from "../Chart";

export default interface IMusicGameSystemEventListener {
  onSave?: (chart: Chart) => string;
  onSerialize?: (chart: Chart) => string;
  onRenderInspector?: (chart: Chart, util: GuiUtility) => void;
  getGroup?: (note: Note, chart: Chart) => string;
  onCustomCanvasMount?: (chart: Chart, app: PIXI.Application) => void;
  onCustomCanvasRender?: (chart: Chart, app: PIXI.Application) => void;
  onCustomTimelineItemRender?: (
    item: CustomTimelineItem,
    chart: Chart
  ) => string;
}
