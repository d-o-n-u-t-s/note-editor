import {
  createStyles,
  FormControl,
  FormControlLabel,
  Switch,
  TextField,
  WithStyles,
  withStyles
} from "@material-ui/core";
import { Theme } from "@material-ui/core/styles/createMuiTheme";
import { observer } from "mobx-react";
import * as React from "react";
import { inject, InjectedComponent } from "../stores/inject";

const styles = (theme: Theme) => createStyles({});

interface IProps extends WithStyles<typeof styles> {}

@inject
@observer
class EditorSetting extends InjectedComponent<IProps> {
  state = {};

  handleChange = (event: any) => {
    this.setState({ [event.target.name]: event.target.value });
  };

  render() {
    if (!this.injected.editor || !this.injected.editor!.currentChart) {
      return <div />;
    }

    const editor = this.injected.editor;

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
            inputProps={{
              min: "1"
            }}
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

          <FormControlLabel
            control={
              <Switch
                checked={editor.setting.measureDivisionMultiplyBeat}
                onChange={(_, value) =>
                  editor.setting.setMeasureDivisionMultiplyBeat(value)
                }
                value="checkedB"
                color="primary"
              />
            }
            label="拍子を考慮した小節分割"
          />
        </FormControl>
      </div>
    );
  }
}

export default withStyles(styles)(EditorSetting);
