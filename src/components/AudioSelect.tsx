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

interface IProps extends WithStyles<typeof styles> {
  value: number | null;
  onChange: (newValue: number | null) => void;
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
          value={this.props.value === null ? -1 : this.props.value}
          onChange={(e: any) => {
            const v = e.target.value;
            this.props.onChange(v === -1 ? null : v);
          }}
          inputProps={{
            className: classes.input,
            name: "currentAudio",
            id: "audio"
          }}
        >
          <MenuItem value={-1}>
            <em>None</em>
          </MenuItem>
          {editor.asset.audioAssetPaths.map((c, i) => (
            <MenuItem value={i} key={i}>
              {c.split("/").pop()}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  }
}

export default withStyles(styles)(AudioSelect);
