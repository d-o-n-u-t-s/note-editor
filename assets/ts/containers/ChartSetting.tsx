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

import AudioSelect from "../components/AudioSelect";
import MusicGameSystemSelect from "../components/MusicGameSystemSelect";

const styles = (theme: Theme) =>
  createStyles({
    playerButton: {}
  });

interface Props extends WithStyles<typeof styles> {
  editor?: Editor;
}

/**
 * 譜面設定コンポーネント
 */
@inject("editor")
@observer
class ChartSetting extends React.Component<Props, {}> {
  state = {
    vV: 0,
    currentAudio: ""
  };

  handleChange = (event: any) => {
    this.setState({ [event.target.name]: event.target.value });
  };

  private handleChartChange = (_: any, value: number) => {
    this.props.editor!.setCurrentChart(value);
  };

  handleAudioChange = async (newValue: number | null) => {
    // 音源リセット
    if (newValue === null) {
      this.props.editor!.currentChart!.resetAudio();
      return;
    }

    const path = this.props.editor!.asset.audioAssetPaths[newValue];

    // this.props.editor!.currentChart!.setAudio();

    const nn = await this.props.editor!.asset.loadAudioAsset(path);

    // console.warn(nn);

    this.props.editor!.currentChart!.setAudio(nn, path);
  };

  handleMusicGameSystemsChange = async (newValue: number | null) => {
    console.log("handleMusicGameSystemsChange", newValue);
  };

  render() {
    const editor = this.props.editor;

    // 譜面が存在しない
    if (!editor || !editor.currentChart) return <div />;

    const { classes } = this.props;

    return (
      <div style={{ width: "100%" }}>
        <TextField
          id="name"
          label="タイトル"
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
          onClick={() => {
            localStorage.setItem("chart", editor.currentChart!.toJSON());
          }}
        >
          保存
        </Button>
        <Button
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
