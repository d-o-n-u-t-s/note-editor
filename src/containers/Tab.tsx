import * as React from "react";
import { observer } from "mobx-react";
import { inject, InjectedComponent } from "../stores/inject";
import { Tabs, Tab, IconButton } from "@material-ui/core";
import CloseIcon from "@material-ui/icons/Close";

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

  refs2: (HTMLElement | null)[] = [];
  refs3: (HTMLElement | null)[] = [];

  componentWillUpdate() {
    this.refs2 = [];
    this.refs3 = [];
  }

  componentDidUpdate() {
    for (var i = 0; i < this.refs2.length; i++) {
      if (!this.refs2[i] || !this.refs3[i]) continue;
      //  this.refs2[i]!.appendChild(this.refs3[i]!);
    }
  }

  render() {
    const editor = this.injected.editor;

    return (
      <div>
        {editor.charts.map((chart, index) => (
          <IconButton
            style={{ marginLeft: "-1.5rem" }}
            key={index}
            aria-label="Delete"
            buttonRef={a => {
              this.refs3.push(a);
            }}
            onClick={() => {
              // document.body.appendChild(this.refs3.find(a => a === [index]!);
              editor.removeChart(index);
            }}
          >
            <CloseIcon style={{ fontSize: 16 }} />
          </IconButton>
        ))}
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
                buttonRef={a => {
                  this.refs2.push(a);
                }}
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
