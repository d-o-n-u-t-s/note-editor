import { Record } from "immutable";
import { action } from "mobx";
import { Mutable } from "src/utils/mutable";
import Chart from "../stores/Chart";
import { CustomTimelineItem } from "./CustomTimelineItem";

export type CustomTimeline = Mutable<CustomTimelineRecord>;

export type CustomTimelineData = {
  items: CustomTimelineItem[];
};

const defaultData: CustomTimelineData = {
  items: []
};

/**
 * カスタムタイムライン
 */
export class CustomTimelineRecord extends Record<CustomTimelineData>(defaultData) {
  public static new(chart: Chart, data?: CustomTimelineData): CustomTimeline {
    let timeline = new CustomTimelineRecord(chart, data);
    timeline = Object.assign(timeline, timeline.asMutable());
    timeline.toMutable(timeline);
    return timeline;
  }

  private toMutable(data: CustomTimelineData) {}

  static newnew(chart: Chart, data?: CustomTimelineData): CustomTimeline {
    const timeline = new CustomTimelineRecord(chart, data);
    return Object.assign(timeline, timeline.asMutable());
  }

  private constructor(chart: Chart, data?: CustomTimelineData) {
    super(data);
    console.log("constractor");
  }

  @action
  public addItem(item: CustomTimelineItem) {
    this.items.push(item);
  }

  @action
  public removeItem(item: CustomTimelineItem) {
    (this as Mutable<CustomTimelineRecord>).items = this.items.filter(i => i != item);
  }
}
