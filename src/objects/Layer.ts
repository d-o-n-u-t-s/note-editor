import { Record } from "immutable";
import { GUID } from "../util";
import { Mutable } from "../utils/mutable";

export type LayerData = {
  guid: GUID;
  name: string;
  visible: boolean;
};

const defaultLayerData: LayerData = {
  guid: "",
  name: "",
  visible: true
};

export type Layer = Mutable<LayerRecord>;

export class LayerRecord extends Record<LayerData>(defaultLayerData) {
  static new(data: LayerData): Layer {
    return new LayerRecord(data).asMutable();
  }

  private constructor(data: LayerData) {
    super(data);
  }
}
