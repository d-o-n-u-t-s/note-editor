import * as React from "react";
import { observer, inject } from "mobx-react";
import { Theme } from "@material-ui/core/styles/createMuiTheme";
import {
  Select,
  TextField,
  FormControl,
  MenuItem,
  InputLabel,
  WithStyles,
  withStyles,
  createStyles,
  Button
} from "@material-ui/core";
import Editor from "../stores/EditorStore";

const styles = (theme: Theme) =>
  createStyles({
    playerButton: {}
  });

function a(ina: number) {}

interface Props extends WithStyles<typeof styles> {
  editor?: Editor;
  value: number | null;
  onChange: (newValue: number | null) => void;
}

@inject("editor")
@observer
class AudioSelect extends React.Component<Props, {}> {
  handleAudioChange() {}

  render() {
    const { editor, classes } = this.props;

    if (!editor) return <div />;

    return (
      <FormControl style={{ width: "100%" }}>
        <InputLabel htmlFor="audio">音源</InputLabel>
        {(() => {
          return (
            <Select
              value={this.props.value === null ? -1 : this.props.value}
              onChange={(e: any) => {
                const v = e.target.value;
                this.props.onChange(v === -1 ? null : v);
              }}
              inputProps={{ name: "currentAudio", id: "audio" }}
            >
              <MenuItem value={-1}>
                <em>None</em>
              </MenuItem>
              {this.props.editor!.asset.audioAssetPaths.map((c, i) => (
                <MenuItem value={i} key={i}>
                  {c.split("/").pop()}
                </MenuItem>
              ))}
            </Select>
          );
        })()}
      </FormControl>
    );
  }
}

export default withStyles(styles)(AudioSelect);
