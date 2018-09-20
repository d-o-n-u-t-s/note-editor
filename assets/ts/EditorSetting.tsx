import * as React from "react";

import {
  FormControl,
  Select,
  InputLabel,
  MenuItem,
  TextField,
  WithStyles,
  withStyles,
  createStyles
} from "@material-ui/core";
import { observer, inject } from "mobx-react";
import { configure } from "mobx";

configure({
  enforceActions: "observed"
});

import { Editor } from "./stores/EditorStore";
import { Theme } from "@material-ui/core/styles/createMuiTheme";

import AddIcon from "@material-ui/icons/Add";

const styles = (theme: Theme) =>
  createStyles({
    fab: {
      position: "absolute",
      top: theme.spacing.unit * 8,
      right: theme.spacing.unit * 2,
      zIndex: 1
    }
  });

interface Props extends WithStyles<typeof styles> {
  editor?: Editor;
}

@inject("editor")
@observer
class EditorSetting extends React.Component<Props, {}> {
  state = {};

  handleChange = (event: any) => {
    this.setState({ [event.target.name]: event.target.value });
  };

  render() {
    if (!this.props.editor || !this.props.editor!.currentChart) {
      return <div />;
    }

    const editor = this.props.editor!;
    const classes = this.props.classes;

    return (
      <div style={{ width: "100%" }}>
        <FormControl>
          <TextField
            id="number"
            label="タイムライン幅"
            value={editor.setting!.laneWidth}
            onChange={(e: any) => {
              editor.setting!.setLaneWidth(e.target.value | 0);
            }}
            type="number"
            InputLabelProps={{
              shrink: true
            }}
            margin="normal"
          />

          <TextField
            id="number"
            label="Vertical Lane Count"
            value={editor.setting!.verticalLaneCount}
            onChange={(e: any) => {
              editor.setting!.setVerticalLaneCount(e.target.value | 0);
            }}
            type="number"
            InputLabelProps={{
              shrink: true
            }}
            margin="normal"
          />

          <TextField
            id="number"
            label="余白"
            value={editor.setting!.padding}
            onChange={(e: any) => {
              editor.setting!.setPadding(e.target.value | 0);
            }}
            type="number"
            InputLabelProps={{
              shrink: true
            }}
            margin="normal"
          />
        </FormControl>

        {/*

        */}
      </div>
    );
  }
}

export default withStyles(styles)(EditorSetting);
