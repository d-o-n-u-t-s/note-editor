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
import { Editor } from "../stores/EditorStore";

const styles = (theme: Theme) =>
  createStyles({
    playerButton: {}
  });

interface Props extends WithStyles<typeof styles> {
  editor?: Editor;
  value: number | null;
  onChange: (newValue: number | null) => void;
}

@inject("editor")
@observer
class MusicGameSystemSelect extends React.Component<Props, {}> {
  render() {
    const { editor, classes } = this.props;

    // 譜面が存在しない
    if (!editor || !editor.currentChart) return <div />;

    return (
      <FormControl style={{ width: "100%" }}>
        <InputLabel htmlFor="musicGameSystem">システム</InputLabel>
        {(() => {
          return (
            <Select
              value={this.props.value === null ? -1 : this.props.value}
              onChange={(e: any) => {
                const v = e.target.value;
                this.props.onChange(v === -1 ? null : v);
              }}
              inputProps={{
                name: "currentMusicGameSystem",
                id: "musicGameSystem"
              }}
            >
              <MenuItem value={-1}>
                <em>None</em>
              </MenuItem>
              {this.props.editor!.asset.musicGameSystems.map((c, i) => (
                <MenuItem value={i} key={i}>
                  {c.name}
                </MenuItem>
              ))}
            </Select>
          );
        })()}
      </FormControl>
    );
  }
}

export default withStyles(styles)(MusicGameSystemSelect);
