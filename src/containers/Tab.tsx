import { IconButton, Tab, Tabs } from "@material-ui/core";
import CloseIcon from "@material-ui/icons/Close";
import { observer } from "mobx-react";
import * as React from "react";
import { useEffect } from "react";
import Chart from "../stores/Chart";
import { useStores } from "../stores/stores";

const closeButtonContainerId = "closeButtonContainerId";
let tabElements: HTMLElement[] = [];
let closeButtons: { chart: Chart; el: HTMLElement }[] = [];

export default observer(function ChartTab() {
  const { editor } = useStores();

  function handleChartChange(_: any, value: number) {
    editor.setCurrentChart(value);
  }

  // componentDidUpdate
  useEffect(() => {
    for (let i = 0; i < tabElements.length; i++) {
      tabElements[i].appendChild(closeButtons[i].el);
    }
  });

  tabElements = [];
  closeButtons = [];

  return (
    <div>
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
            label={chart.name}
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
