import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  WithStyles,
  withStyles,
  Button
} from "@material-ui/core";
import { observer } from "mobx-react";
import * as React from "react";
import AudioSelect from "../components/AudioSelect";
import MusicGameSystemSelect from "../components/MusicGameSystemSelect";
import { inject, InjectedComponent } from "../stores/inject";
import styles from "../styles/styles";

interface IProps extends WithStyles<typeof styles> {}

/**
 * 譜面設定コンポーネント
 */
@inject
@observer
class ChartSetting extends InjectedComponent<IProps> {
  handleAudioChange = async (newValue: string) => {
    // 音源リセット
    if (newValue === null) {
      this.injected.editor.currentChart!.resetAudio();
      return;
    }

    const buffer = this.injected.editor.asset.loadAudioAsset(newValue);
    if (buffer) this.injected.editor.currentChart!.setAudio(buffer, newValue);
  };

  handleMusicGameSystemsChange = async (newValue: number | null) => {
    console.log("handleMusicGameSystemsChange", newValue);
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
    const editor = this.injected.editor;

    // 譜面が存在しない
    if (!editor || !editor.currentChart) return <div />;

    const chart = editor.currentChart;

    const { classes } = this.props;

    return (
      <div style={{ width: "100%" }}>
        {this.renderTextField("タイトル", chart.name, (value: any) =>
          chart!.setName(value)
        )}
        <AudioSelect
          value={editor.currentChart!.audioSource || ""}
          onChange={this.handleAudioChange}
        />
        {this.renderTextField(
          "開始時間",
          editor.currentChart.startTime.toString(),
          (value: any) => editor.currentChart!.setStartTime(parseFloat(value)),
          "number"
        )}
        <FormControl style={{ width: "100%", margin: "6px 0" }}>
          <InputLabel htmlFor="difficulty" className={classes.label}>
            難易度
          </InputLabel>
          <Select
            value={chart.difficulty}
            onChange={({ target: { value } }) => {
              chart.setDifficulty(parseInt(value as string));
            }}
            inputProps={{
              className: classes.input,
              id: "difficulty"
            }}
          >
            {chart.musicGameSystem!.difficulties.map((difficulty, index) => (
              <MenuItem value={index} key={difficulty}>
                {difficulty}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <MusicGameSystemSelect
          value={editor.asset.musicGameSystems.findIndex(
            path => path === chart.musicGameSystem
          )}
          onChange={this.handleMusicGameSystemsChange}
        />
        <div
          style={{
            maxHeight: 200,
            whiteSpace: "pre",
            overflow: "scroll",
            background: "#eee"
          }}
        />
        <Button
          variant="outlined"
          onClick={() => editor.setInspectorTarget(chart.customProps)}
        >
          カスタム設定
        </Button>
      </div>
    );
  }
}

export default withStyles(styles)(ChartSetting);
