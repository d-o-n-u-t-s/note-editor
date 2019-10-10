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

  renderTextField = (
    label: string,
    value: string,
    onChange: any,
    type = "text"
  ) => (
    <TextField
      type={type}
      label={label}
      fullWidth
      style={{ margin: "6px 0" }}
      value={value}
      onChange={(e: any) => onChange(e.target.value)}
      InputLabelProps={{
        className: this.props.classes.label
      }}
      InputProps={{
        classes: {
          input: this.props.classes.input
        }
      }}
    />
  );

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
          {this.renderTextField(
            "小節の幅",
            setting.measureWidth.toString(),
            (value: any) => setting.setMeasureWidth(value | 0),
            "number"
          )}

          {this.renderTextField(
            "小節の高さ",
            setting.measureHeight.toString(),
            (value: any) => setting.setMeasureHeight(value | 0),
            "number"
          )}

          {this.renderTextField(
            "Vertical Lane Count",
            setting.verticalLaneCount.toString(),
            (value: any) => setting.setVerticalLaneCount(value | 0),
            "number"
          )}

          {this.renderTextField(
            "余白",
            setting.padding.toString(),
            (value: any) => setting.setPadding(value | 0),
            "number"
          )}

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
                checked={setting.preserve3D}
                onChange={(_, value) =>
                  setting.set3D(
                    value,
                    setting.rotateX,
                    setting.scale3D,
                    setting.perspective
                  )
                }
                color="primary"
              />
            }
            label="3D モード"
          />

          {this.renderTextField(
            "3D 回転",
            setting.rotateX.toString(),
            (value: any) =>
              setting.set3D(
                setting.preserve3D,
                parseFloat(value),
                setting.scale3D,
                setting.perspective
              ),
            "number"
          )}

          {this.renderTextField(
            "3D 拡大率",
            setting.scale3D.toString(),
            (value: any) =>
              setting.set3D(
                setting.preserve3D,
                setting.rotateX,
                parseFloat(value),
                setting.perspective
              ),
            "number"
          )}

          {this.renderTextField(
            "3D 遠近",
            setting.perspective.toString(),
            (value: any) =>
              setting.set3D(
                setting.preserve3D,
                setting.rotateX,
                setting.scale3D,
                parseFloat(value)
              ),
            "number"
          )}
        </FormControl>
      </div>
    );
  }
}

export default withStyles(styles)(EditorSetting);
