import * as React from "react";

import { observer, inject } from "mobx-react";

import { configure } from "mobx";

import { Editor } from "./stores/EditorStore";

interface Props {
  editor?: Editor;
}

import { Tabs, Tab } from "@material-ui/core";

@inject("editor")
@observer
export default class ChartTab extends React.Component<Props, {}> {
  state = {
    currentAudio: ""
  };

  handleChange = (event: any) => {
    this.setState({ [event.target.name]: event.target.value });
  };

  private handleChartChange = (_: any, value: number) => {
    this.props.editor!.setCurrentChart(value);
  };

  render() {
    const editor = this.props.editor;

    return (
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
            <Tab key={index} label={chart.name} />
          ))
        ) : (
          <div />
        )}
      </Tabs>
    );
  }
}
