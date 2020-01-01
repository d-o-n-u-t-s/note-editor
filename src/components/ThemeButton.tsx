import { IconButton } from "@material-ui/core";
import Brightness4Icon from "@material-ui/icons/Brightness4";
import Brightness7Icon from "@material-ui/icons/Brightness7";
import { observer } from "mobx-react";
import * as React from "react";
import { useStores } from "../stores/stores";

/**
 * テーマ切り替えボタン
 */
export default observer(function ThemeButton() {
  const { editor } = useStores();
  return (
    <IconButton
      onClick={() => {
        editor.setting.toggleMuiTheme();
      }}
    >
      {editor.setting.muiThemeType === "light" ? (
        <Brightness4Icon />
      ) : (
        <Brightness7Icon />
      )}
    </IconButton>
  );
});
