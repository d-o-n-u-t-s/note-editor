import { IconButton, Tab, Tabs } from "@material-ui/core";
import CloseIcon from "@material-ui/icons/Close";
import { observer } from "mobx-react";
import * as React from "react";
import { useEffect } from "react";
import Chart from "../stores/Chart";
import { ChartTabLabelType } from "../stores/EditorSetting";
import { useStores } from "../stores/stores";

const closeButtonContainerId = "closeButtonContainerId";
let tabElements: HTMLElement[] = [];
let closeButtons: { chart: Chart; el: HTMLElement }[] = [];
let container: HTMLDivElement | null = null;

export default observer(function ChartTab() {
  const { editor } = useStores();

  function handleChartChange(_: any, value: number) {
    editor.setCurrentChart(value);
  }

  function getTabLabel(chart: Chart) {
    switch (editor.setting.tabLabelType) {
      case ChartTabLabelType.Name:
        return chart.name;
      case ChartTabLabelType.FilePath:
        return chart.filePath ?? "新規譜面";
      default:
        throw editor.setting.tabLabelType;
    }
  }

  // componentDidUpdate
  useEffect(() => {
    for (let i = 0; i < tabElements.length; i++) {
      tabElements[i].appendChild(closeButtons[i].el);
    }
    editor.setting.tabHeight = container?.clientHeight ?? 0;
  });

  tabElements = [];
  closeButtons = [];

  return (
    <div ref={el => (container = el)}>
      <div id={closeButtonContainerId}>
        {editor.charts.map((chart, index) => (
          <IconButton
            style={{ marginLeft: "-1.5rem" }}
            key={index}
            aria-label="Delete"
            buttonRef={(el: HTMLElement) => {
              if (!el) return;
              closeButtons.push({ chart, el });
            }}
            onClick={() => {
              const container = document.querySelector(
                `#${closeButtonContainerId}`
              )!;
              for (const button of closeButtons) {
                container.appendChild(button.el);
              }
              editor.removeChart(index);
            }}
          >
            <CloseIcon style={{ fontSize: 16 }} />
          </IconButton>
        ))}
      </div>

      <Tabs
        value={editor.currentChartIndex}
        onChange={handleChartChange}
        variant="scrollable"
        indicatorColor="primary"
        textColor="primary"
        scrollButtons="auto"
      >
        {editor.charts.map((chart, index) => (
          <Tab
            key={index}
            label={getTabLabel(chart)}
            buttonRef={(el: HTMLElement) => {
              if (!el) return;
              tabElements.push(el);
            }}
          />
        ))}
      </Tabs>
    </div>
  );
});
