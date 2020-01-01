import { Lane } from "./Lane";
import LaneRenderer, { ILaneRenderer } from "./LaneRenderer";
import Pixi from "../containers/Pixi";

export default class LaneRendererResolver {
  static resolve(lane: Lane): ILaneRenderer {
    // レーンテンプレート
    const laneTemplate = Pixi.instance!.injected.editor!.currentChart!.musicGameSystem.laneTemplateMap.get(
      lane.templateName
    )!;

    if (laneTemplate.name === "default") return LaneRenderer;

    if (laneTemplate.rendererReference) {
      return {
        getNotePointInfo: LaneRenderer.getNotePointInfo,
        getNotePointInfoFromMousePosition:
          LaneRenderer.getNotePointInfoFromMousePosition,
        defaultRender: laneTemplate.rendererReference as any,
        render: LaneRenderer.render
      };
    } else return LaneRenderer;
  }
}
