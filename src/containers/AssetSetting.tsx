import * as React from "react";

import { observer } from "mobx-react";

interface Props {
  base: number;
}

import { Button } from "@material-ui/core";

import * as Electrom from "electron";

const electron = (window as any).require("electron");
const remote = electron.remote as Electrom.Remote;
const BrowserWindow = remote.BrowserWindow;

import { inject, InjectedComponent } from "../stores/inject";

@inject
@observer
export default class AssetSetting extends InjectedComponent<Props> {
  render() {
    const editor = this.injected.editor;

    this.props;

    if (!editor) {
      return <div />;
    }

    return (
      <div>
        <Button
          color="primary"
          aria-label="Add"
          onClick={() => {
            editor!.asset.openAudioAssetDirectory();
          }}
          //className={classes.button}
        >
          load audio directory
        </Button>

        <div style={{ overflow: "scroll" }}>
          {editor.asset.audioAssetPaths.map((audioAssetPath, index) => (
            <div
              key={index}
              style={{
                margin: "0 .5rem",
                fontSize: "0.8rem"
              }}
            >
              {audioAssetPath.split("/").pop()}
            </div>
          ))}
        </div>
      </div>
    );
  }
}
