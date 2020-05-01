import { observer } from "mobx-react";
import * as React from "react";
import * as vis from "vis";
import { TimelineItem } from "vis";
import {
  CustomTimelineItem,
  CustomTimelineItemRecord
} from "../objects/CustomTimelineItem";
import Chart from "../stores/Chart";
import { inject, InjectedComponent } from "../stores/inject";
import {
  CustomProperty,
  MusicGameSystemCustomTimelineGroup
} from "../stores/musicGameSystem/MusicGameSystemCustomTimeline";

type VisTimelineItemId = number;

@inject
@observer
class VisTimeline extends InjectedComponent {
  private container?: HTMLDivElement;
  private timeline?: vis.Timeline;

  private itemMap: Map<VisTimelineItemId, CustomTimelineItem> = new Map<
    any,
    any
  >();

  private readonly customTimeId: string | number = 999;

  /**
   * 譜面変更通知
   * @param chart
   */
  private handleChartChange(chart: Chart) {
    const timeline = this.timeline!;

    const groups = new vis.DataSet();

    for (const group of chart.musicGameSystem.customTimeline?.groups ?? []) {
      groups.add({
        id: group.id,
        content: group.name
      });
    }

    timeline.setGroups(groups);

    const items = new vis.DataSet([]);

    // アイテムを読み込む
    for (const item of chart.customTimeline.items) {
      const id = Math.random();

      const newItem = {
        start: item.start * 1000,
        end: item.end * 1000,
        group: item.groupId,
        id: id,
        className: "custom-timeline-item",
        type: "range"
      };

      items.add(newItem as any);

      this.itemMap.set(id, item);
    }

    setTimeout(() => {
      let index = 0;
      for (const measure of chart.timeline.measures) {
        items.add({
          className: ["visA", "visB"][index % 2],
          id: Math.random(),
          content: `m${index++}`,
          start: measure.beginTime * 1000,
          end: measure.endTime * 1000,
          type: "background"
        } as any);
      }
    }, 1000);

    // template
    if (chart.musicGameSystem.eventListeners.onCustomTimelineItemRender) {
      timeline.setOptions({
        template: item => {
          return chart.musicGameSystem.eventListeners
            .onCustomTimelineItemRender!(this.itemMap.get(item.id)!, chart);
        }
      });
    } else {
      timeline.setOptions({ template: undefined });
    }

    timeline.setItems(items);
  }

  private inspect(item: CustomTimelineItem) {
    const chart = this.injected.editor.currentChart!;
    const timeline = chart.customTimeline;

    const groupIdMap = new Map<number, MusicGameSystemCustomTimelineGroup>();
    for (const group of chart.musicGameSystem.customTimeline?.groups ?? []) {
      groupIdMap.set(group.id, group);
    }

    const mgsGroup = groupIdMap.get(item.groupId)!;

    const inspectorConfig = mgsGroup.customProps.reduce(
      (obj: any, prop: CustomProperty) => {
        console.log(obj);

        if (prop.config) {
          obj[prop.key] = prop.config;
        }

        return obj;
      },
      {}
    );

    console.log("inspector config: ", inspectorConfig);

    (item.customProps as any).inspectorConfig = inspectorConfig;
    (item.customProps as any).setValue = (...args: any[]) => {
      const [key, value] = args;

      (item.customProps as any)[key] = value;
      console.warn("set value", args);

      this.timeline!.redraw();
    };

    this.injected.editor.setInspectorTarget(item);
  }

  /**
   * アイテム移動
   */
  private handleItemMove(
    item: TimelineItem,
    callback: (item: TimelineItem | null) => void
  ) {
    const chart = this.injected.editor.currentChart!;
    const measureSize = Math.abs(chart.timeline.measures[0].beginTime - chart.timeline.measures[1].beginTime) * 1000;
    const measureDivSize = measureSize / this.injected.editor.setting.measureDivision;

    // 0以下にしない
    item.start = Math.max(item.start.valueOf() as number, 0);

    // 近いところにスナップ
    item.start = Math.floor(item.start.valueOf() as number / measureDivSize) * (measureDivSize + 1);
    item.end =  Math.floor(item.end!.valueOf() as number / measureDivSize) * (measureDivSize + 1);

    // 最小サイズ以下にしない
    if((item.end!.valueOf() as number - item.start.valueOf() as number) < measureDivSize) {
        item.end = item.start + measureDivSize;
    }

    const n = this.itemMap.get(item.id as number)!;
    n.start = (item.start.valueOf() as number) * 0.001;
    n.end = (item.end!.valueOf() as number) * 0.001;
    callback(item);
  }

  /**
   * 初期化
   */
  componentDidMount() {
    const container = this.container!;

    const options: vis.TimelineOptions = {
      width: "100%",
      height: "30vh",
      min: 0,
      max: 60 * 1000,
      horizontalScroll: true,
      verticalScroll: true,
      zoomKey: "ctrlKey",
      zoomMin: 1000,
      showMajorLabels: false,
      showMinorLabels: false,
      editable: {
        add: true,
        remove: true,
        updateGroup: false,
        updateTime: true,
        overrideItems: false
      },
      clickToUse: true,
      stack: false,

      // always snap to full hours, independent of the scale
      snap: (date, scale, step) => {
        // console.log("snap", date, scale, step);
        return date;
      },

      onAdd: (item, callback) => {
        console.log(item);

        const chart = this.injected.editor.currentChart!;
        const measureSize = Math.abs(chart.timeline.measures[0].beginTime - chart.timeline.measures[1].beginTime) * 1000;

        // 近いところにスナップ
        item.start = Math.floor(item.start.valueOf() as number / measureSize) * measureSize;

        // 開始, 終了時間
        let start = item.start.valueOf() as number;

        // 4小節分のサイズで初期配置
        const end = start + measureSize * 4;

        const timeline = chart.customTimeline;

        const groupIdMap = new Map<
          number,
          MusicGameSystemCustomTimelineGroup
        >();
        for (const group of chart.musicGameSystem.customTimeline?.groups ??
          []) {
          groupIdMap.set(group.id, group);
        }

        console.log("new item: " + item.group, groupIdMap);

        const mgsGroup = groupIdMap.get(item.group as number)!;

        console.warn(mgsGroup);

        const customProps = mgsGroup.customProps.reduce(
          (obj: any, prop: CustomProperty) => {
            obj[prop.key] = prop.defaultValue;
            return obj;
          },
          {}
        );

        const newItem = CustomTimelineItemRecord.new({
          groupId: mgsGroup.id,
          start: start * 0.001,
          end: end * 0.001,
          customProps
        });
        timeline.addItem(newItem);

        const id = Math.random();
        item.id = id;
        item.end = end;
        item.type = "range";
        item.className = "custom-timeline-item";

        this.itemMap.set(id, newItem);

        this.inspect(newItem);

        callback(item);
      },

      onMove: (item, callback) => this.handleItemMove(item, callback),
      onMoving: (item, callback) => this.handleItemMove(item, callback),

      onRemove: (item, callback) => {
        const timeline = this.injected.editor.currentChart!.customTimeline;
        timeline.removeItem(this.itemMap.get(item.id as number)!);
        callback(item);
      }
    };

    const timeline = new vis.Timeline(container!, new vis.DataSet([]), options);
    this.timeline = timeline;

    timeline.addCustomTime(0, this.customTimeId);
    (timeline as any).customTimes[
      (timeline as any).customTimes.length - 1
    ].hammer.off("panstart panmove panend");

    timeline.setOptions(options);

    timeline.on("select", props => {
      if (props.items.length !== 1) {
        console.error("要素数が不正です", props.items);
        return;
      }

      const selectedItemId = props.items[0];

      const selectedItem = this.itemMap.get(selectedItemId)!;
      this.inspect(selectedItem);
    });

    (window as any).tl = timeline;

    let prevChart: Chart | null = null;
    let prevTime = 0;
    let prevDuration = 0;

    setInterval(() => {
      const chart = this.injected.editor.currentChart;
      if (!chart) return;

      if (prevChart != chart) {
        this.handleChartChange(chart);
        prevChart = chart;
      }

      if (prevTime != chart.time) {
        prevTime = chart.time;
        timeline.setCustomTime(chart.time * 1000, this.customTimeId);
        if (!isNaN(chart.time)) timeline.moveTo(chart.time * 1000, {animation: false});
      }
      const duration = chart.audio!.duration();
      if (prevDuration != duration) {
        prevDuration = duration;
        timeline.setOptions({
          max: chart.audio!.duration() * 1000
        });
      }
    }, 1000 / 60);
  }

  render() {
    const component = this;

    return (
      <div>
        <span style={{ display: "none" }}>
          {this.injected.editor.currentChart?.time}
        </span>
        <div
          style={{
            display:
              this.injected.editor.currentChart?.musicGameSystem
                ?.customTimeline &&
              this.injected.editor.setting.showCustomTimeline
                ? "block"
                : "none",
            width: "100%"
          }}
          ref={thisDiv => {
            component.container = thisDiv!;
          }}
        />
      </div>
    );
  }
}

export default VisTimeline;
