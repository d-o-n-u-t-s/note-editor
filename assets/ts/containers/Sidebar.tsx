import * as React from "react";

import { observer, inject } from "mobx-react";

import { configure } from "mobx";

configure({
  enforceActions: "observed"
});

import Editor from "../stores/EditorStore";

interface Props {
  editor?: Editor;
}
import { Button } from "@material-ui/core";

import * as Electrom from "electron";

const electron = (window as any).require("electron");
const remote = electron.remote as Electrom.Remote;
const BrowserWindow = remote.BrowserWindow;

@inject("editor")
@observer
export default class ChartTab extends React.Component<Props, {}> {
  render() {
    const editor = this.props.editor;

    if (!editor) {
      return <div />;
    }

    return <div />;
  }
}
