import {
  Button,
  createStyles,
  TextField,
  WithStyles,
  withStyles
} from "@material-ui/core";
import { Theme } from "@material-ui/core/styles/createMuiTheme";
import { observer } from "mobx-react";
import * as React from "react";
import AudioSelect from "../components/AudioSelect";
import MusicGameSystemSelect from "../components/MusicGameSystemSelect";
import { inject, InjectedComponent } from "../stores/inject";

const styles = (theme: Theme) =>
  createStyles({
    playerButton: {}
  });

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

  render() {
    const editor = this.injected.editor;

    // 譜面が存在しない
    if (!editor || !editor.currentChart) return <div />;

    const { classes } = this.props;

    return (
      <div style={{ width: "100%" }}>
        <TextField
          id="name"
          label="タイトル"
          style={{ fontSize: 14, width: "100%" }}
          value={editor.currentChart.name}
          onChange={(e: any) => editor.currentChart!.setName(e.target.value)}
          margin="normal"
        />

        <AudioSelect
          value={editor.asset.audioAssetPaths.findIndex(
            path => path === editor.currentChart!.audioSource
          )}
          onChange={this.handleAudioChange}
        />

        <TextField
          id="name"
          label="開始時間"
          value={editor.currentChart.startTime}
          onChange={(e: any) =>
            editor.currentChart!.setStartTime(parseFloat(e.target.value))
          }
          margin="normal"
          type="number"
        />

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
        >
          最適化
        </Button>
      </div>
    );
  }
}

export default withStyles(styles)(ChartSetting);
