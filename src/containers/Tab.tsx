import { IconButton, Tab, Tabs } from "@material-ui/core";
import CloseIcon from "@material-ui/icons/Close";
import { observer } from "mobx-react";
import * as React from "react";
import Chart from "../stores/Chart";
import { inject, InjectedComponent } from "../stores/inject";

@inject
@observer
export default class ChartTab extends InjectedComponent {
  handleChange = (event: any) => {
    this.setState({ [event.target.name]: event.target.value });
  };

  private handleChartChange = (_: any, value: number) => {
    this.injected.editor.setCurrentChart(value);
  };

  tabElements: HTMLElement[] = [];
  closeButtons: { chart: Chart; el: HTMLElement }[] = [];

  componentDidUpdate() {
    for (let i = 0; i < this.tabElements.length; i++) {
      this.tabElements[i].appendChild(this.closeButtons[i].el);
    }
  }

  readonly closeButtonContainerId = "closeButtonContainerId";

  render() {
    const editor = this.injected.editor;

    this.tabElements = [];
    this.closeButtons = [];

    return (
      <div>
        <div id={this.closeButtonContainerId}>
          {editor.charts.map((chart, index) => (
            <IconButton
              style={{ marginLeft: "-1.5rem" }}
              key={index}
              aria-label="Delete"
              buttonRef={(el: HTMLElement) => {
                if (!el) return;
                this.closeButtons.push({ chart, el });
              }}
              onClick={() => {
                const container = document.querySelector(
                  `#${this.closeButtonContainerId}`
                )!;
                for (const button of this.closeButtons) {
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
          onChange={this.handleChartChange}
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
                this.tabElements.push(el);
              }}
            />
          ))}
        </Tabs>
      </div>
    );
  }
}
