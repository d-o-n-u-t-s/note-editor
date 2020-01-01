import { Button } from "@material-ui/core";
import { observer } from "mobx-react";
import * as React from "react";
import { useStores } from "../stores/stores";

const AssetSetting = observer(() => {
  const { editor } = useStores();

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
});

export default AssetSetting;
