import * as React from "react";
import { observer } from "mobx-react";
import { inject, InjectedComponent } from "../stores/inject";
import { Tabs, Tab, IconButton } from "@material-ui/core";
import CloseIcon from "@material-ui/icons/Close";
import Chart from "../stores/Chart";

@inject
@observer
export default class ChartTab extends InjectedComponent {
  state = {};

  handleChange = (event: any) => {
    this.setState({ [event.target.name]: event.target.value });
  };

  private handleChartChange = (_: any, value: number) => {
    this.injected.editor!.setCurrentChart(value);
  };

  tabElements: (HTMLElement | null)[] = [];
  closeButtons: { chart: Chart; el: HTMLElement | null }[] = [];

  componentWillUpdate() {
    this.tabElements = [];
    this.closeButtons = [];
  }

  componentDidUpdate() {
    for (var i = 0; i < this.tabElements.length; i++) {
      if (!this.tabElements[i] || !this.closeButtons[i].el) continue;
      this.tabElements[i]!.appendChild(this.closeButtons[i].el!);
    }
  }

  readonly closeButtonContainerId = "closeButtonContainerId";

  render() {
    const editor = this.injected.editor;

    return (
      <div>
        <div id={this.closeButtonContainerId}>
          {editor.charts.map((chart, index) => (
            <IconButton
              style={{ marginLeft: "-1.5rem" }}
              key={index}
              aria-label="Delete"
              buttonRef={el => {
                this.closeButtons.push({ chart, el });
              }}
              onClick={() => {
                document
                  .querySelector(`#${this.closeButtonContainerId}`)!
                  .appendChild(
                    this.closeButtons.find(
                      button => button.chart === chart && button.el !== null
                    )!.el!
                  );
                editor.removeChart(index);
              }}
            >
              <CloseIcon style={{ fontSize: 16 }} />
            </IconButton>
          ))}
        </div>
        <Tabs
          value={editor ? editor.currentChartIndex : -1}
          onChange={this.handleChartChange}
          scrollable
          indicatorColor="primary"
          textColor="primary"
          scrollButtons="auto"
        >
          {editor ? (
            editor!.charts.map((chart, index) => (
              <Tab
                key={index}
                label={chart.name}
                buttonRef={el => this.tabElements.push(el)}
              />
            ))
          ) : (
            <div />
          )}
        </Tabs>
      </div>
    );
  }
}
