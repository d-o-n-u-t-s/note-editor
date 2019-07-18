import { Button } from "@material-ui/core";
import { observer } from "mobx-react";
import * as React from "react";
import { inject, InjectedComponent } from "../stores/inject";

@inject
@observer
export default class AssetSetting extends InjectedComponent {
  render() {
    const { editor } = this.injected;

    return (
      <div>
        <Button
          color="primary"
          aria-label="Add"
          onClick={() => {
            editor.asset.openAudioAssetDirectory();
          }}
        >
          load audio directory
        </Button>
      </div>
    );
  }
}
