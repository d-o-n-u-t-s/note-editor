import {
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  WithStyles,
  withStyles
} from "@material-ui/core";
import { observer } from "mobx-react";
import * as React from "react";
import { inject, InjectedComponent } from "../stores/inject";
import styles from "../styles/styles";

interface IProps extends WithStyles<typeof styles> {}

@inject
@observer
class EditorSetting extends InjectedComponent<IProps> {
  state = {};

  handleChange = (event: any) => {
    this.setState({ [event.target.name]: event.target.value });
  };

  render() {
    if (!this.injected.editor.currentChart) {
      return <div />;
    }

    const editor = this.injected.editor;
    const classes = this.props.classes;
    const setting = editor.setting;

    return (
      <div style={{ width: "100%" }}>
        <FormControl>
          <TextField
            id="number"
            label="小節の幅"
            value={setting.measureWidth}
            onChange={(e: any) => {
              setting.setMeasureWidth(e.target.value | 0);
            }}
            type="number"
            InputLabelProps={{
              shrink: true
            }}
            margin="normal"
          />

          <TextField
            id="number"
            label="小節の高さ"
            value={setting.measureHeight}
            onChange={(e: any) => {
              setting.setMeasureHeight(e.target.value | 0);
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
            value={setting.verticalLaneCount}
            onChange={(e: any) => {
              setting.setVerticalLaneCount(e.target.value | 0);
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
            value={setting.padding}
            onChange={(e: any) => {
              setting.setPadding(e.target.value | 0);
            }}
            type="number"
            InputLabelProps={{
              shrink: true
            }}
            margin="normal"
          />

          <FormControl style={{ width: "100%", margin: "6px 0" }}>
            <InputLabel htmlFor="measureLayout" className={classes.label}>
              小節レイアウト
            </InputLabel>
            <Select
              value={setting.currentMeasureLayoutIndex}
              onChange={(e: any) => {
                const value: number = e.target.value;
                setting.setCurrentMeasureLayoutIndex(value);
              }}
              inputProps={{
                className: classes.input,
                id: "measureLayout"
              }}
            >
              {setting.measureLayouts.map((layout, index) => (
                <MenuItem value={index} key={index}>
                  {layout.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControlLabel
            control={
              <Switch
                checked={setting.reverseScroll}
                onChange={(_, value) => setting.setReverseScroll(value)}
                color="primary"
              />
            }
            label="スクロール反転"
          />

          <FormControlLabel
            control={
              <Switch
                checked={setting.measureDivisionMultiplyBeat}
                onChange={(_, value) =>
                  setting.setMeasureDivisionMultiplyBeat(value)
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
