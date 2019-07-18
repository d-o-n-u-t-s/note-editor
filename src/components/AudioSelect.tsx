import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  WithStyles,
  withStyles
} from "@material-ui/core";
import { observer } from "mobx-react";
import * as React from "react";
import { inject, InjectedComponent } from "../stores/inject";
import styles from "../styles/styles";
import { remote } from "electron";

interface IProps extends WithStyles<typeof styles> {
  value: string;
  onChange: (newValue: string) => void;
}

@inject
@observer
class AudioSelect extends InjectedComponent<IProps> {
  handleAudioChange() {}

  render() {
    const { editor } = this.injected;
    const { classes } = this.props;

    if (!editor) return <div />;

    return (
      <FormControl style={{ width: "100%", margin: "6px 0" }}>
        <InputLabel htmlFor="audio" className={classes.label}>
          音源
        </InputLabel>
        <Select
          value={0}
          onClick={(e: any) => {
            const result = remote.dialog.showOpenDialog({
              defaultPath: editor.asset.audioAssetPath,
              filters: [{ name: "音源", extensions: ["mp3", "wav"] }]
            });
            if (result) this.props.onChange(result[0].split("/").pop()!);
          }}
          inputProps={{ disabled: true }}
        >
          <MenuItem value="0">{this.props.value || <em>None</em>}</MenuItem>
        </Select>
      </FormControl>
    );
  }
}

export default withStyles(styles)(AudioSelect);
