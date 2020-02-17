import { Record } from "immutable";
import { Mutable } from "src/utils/mutable";

export type CustomTimelineItemData = {
  groupId: number;
  start: number;
  end: number;
  customProps: any;
};

export const defaultCustomTimelineItemData = {
  groupId: -1,
  start: 0,
  end: 0,
  customProps: {}
};

export type CustomTimelineItem = Mutable<CustomTimelineItemRecord>;

export class CustomTimelineItemRecord extends Record<CustomTimelineItemData>(defaultCustomTimelineItemData) {
  public static new(data: CustomTimelineItemData): CustomTimelineItem {
    const note = new CustomTimelineItemRecord(data);
    return Object.assign(note, note.asMutable());
  }

  private constructor(data: CustomTimelineItemData) {
    super(data);
  }
}
