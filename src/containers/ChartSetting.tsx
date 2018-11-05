import { Button, TextField, WithStyles, withStyles } from "@material-ui/core";
import { runInAction } from "mobx";
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
  state = {
    vV: 0,
    currentAudio: ""
  };

  handleChange = (event: any) => {
    this.setState({ [event.target.name]: event.target.value });
  };

  private handleChartChange = (_: any, value: number) => {
    this.injected.editor.setCurrentChart(value);
  };

  handleAudioChange = async (newValue: number | null) => {
    // 音源リセット
    if (newValue === null) {
      this.injected.editor.currentChart!.resetAudio();
      return;
    }

    const path = this.injected.editor.asset.audioAssetPaths[newValue];

    // this.injected.editor.currentChart!.setAudio();

    const nn = await this.injected.editor.asset.loadAudioAsset(path);

    // console.warn(nn);

    this.injected.editor.currentChart!.setAudio(nn, path);
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
        {this.renderTextField(
          "タイトル",
          editor.currentChart.name,
          (value: any) => editor.currentChart!.setName(value)
        )}
        <AudioSelect
          value={editor.asset.audioAssetPaths.findIndex(
            path => path === editor.currentChart!.audioSource
          )}
          onChange={this.handleAudioChange}
        />
        {this.renderTextField(
          "開始時間",
          editor.currentChart.startTime.toString(),
          (value: any) => editor.currentChart!.setStartTime(parseFloat(value)),
          "number"
        )}
        {this.renderTextField("難易度", "hard", (value: any) => {})}
        <MusicGameSystemSelect
          value={editor.asset.musicGameSystems.findIndex(
            path => path === editor.currentChart!.musicGameSystem
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
        >
          {/*editor.currentChart!.toJSON()*/}
        </div>
        <Button
          variant="outlined"
          color="primary"
          onClick={() => {
            localStorage.setItem("chart", editor.currentChart!.toJSON());
          }}
          style={{ marginRight: 6 }}
        >
          一時保存
        </Button>
        <Button
          variant="outlined"
          color="primary"
          onClick={() => {
            editor.currentChart!.timeline.optimizeNoteLine();
            editor.currentChart!.timeline.optimiseLane();
          }}
          style={{ marginRight: 6, marginBottom: 6 }}
        >
          最適化
        </Button>
        <Button
          variant="outlined"
          color="secondary"
          onClick={() => {
            if (
              !window.confirm(
                "初期レーンを読み込んで一時譜面に上書きします\n実行しますか？"
              )
            )
              return;

            chart.timeline.clearLanePoints();
            chart.timeline.clearLanes();
            chart.loadInitialLanes();

            // ノートのレーン参照が途切れるので最初のレーンを紐付ける
            runInAction(() => {
              for (const note of chart.timeline.notes) {
                note.data = note.data.set("lane", chart.timeline.lanes[0].guid);
              }
            });

            console.warn(editor.currentChart!.toJSON());
            localStorage.setItem("chart", editor.currentChart!.toJSON());
            location.reload();
          }}
          style={{ marginRight: 6 }}
        >
          初期レーン再読み込み
        </Button>
      </div>
    );
  }
}

export default withStyles(styles)(ChartSetting);
