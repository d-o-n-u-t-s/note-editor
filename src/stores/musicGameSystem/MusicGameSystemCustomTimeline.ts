export type CustomProperty = {
  key: string;
  defaultValue: any;
  config?: any;
};

export type MusicGameSystemCustomTimelineGroup = {
  id: number;
  name: string;
  customProps: CustomProperty[];
};

export type MusicGameSystemCustomTimeline = {
  groups: MusicGameSystemCustomTimelineGroup[];
  template: string;
};

export const defaultMusicGameSystemCustomTimeline = {
  groups: []
};
