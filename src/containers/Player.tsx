import {
  createStyles,
  IconButton,
  withStyles,
  WithStyles
} from "@material-ui/core";
import { Theme } from "@material-ui/core/styles/createMuiTheme";
import NotesIcon from "@material-ui/icons/Notes";
import PauseIcon from "@material-ui/icons/Pause";
import PlayArrow from "@material-ui/icons/PlayArrow";
import SettingsIcon from "@material-ui/icons/Settings";
import SpeakerIcon from "@material-ui/icons/VolumeUp";
import Slider from "@material-ui/lab/Slider";
import { observer } from "mobx-react";
import * as React from "react";
import ChartInformation from "../components/ChartInformation";
import { inject, InjectedComponent } from "../stores/inject";
import { safe } from "../util";

const styles = (theme: Theme) =>
  createStyles({
    playerButton: {},
    timeSliderTrack: {
      height: "4px",
      background: "red"
    },
    timeSliderThumb: {
      width: "14px",
      height: "14px",
      background: "red"
    },
    volumeSliderTrack: {
      height: "4px",
      background: "#fff"
    },
    volumeSliderThumb: {
      width: "14px",
      height: "14px",
      background: "#fff"
    }
  });

interface Props extends WithStyles<typeof styles> {}

@inject
@observer
class Player extends InjectedComponent<Props> {
  state = {
    vV: 0,
    currentAudio: "",
    openInformation: false
  };

  private formatTime(time: number) {
    const sec = Math.floor(time % 60);
    const min = Math.floor(time / 60);

    return `${min}:${sec.toString().padStart(2, "0")}`;
  }

  render() {
    const editor = this.injected.editor;

    const { classes } = this.props;

    const isPlaying = safe(() => editor.currentChart!.isPlaying, false);

    const time = safe(
      () => editor.currentChart!.time / editor.currentChart!.audio!.duration(),
      0
    );

    return (
      <div>
        <div
          style={{
            display: "flex",
            background: "#000",
            margin: "0 14px",
            marginBottom: "14px"
          }}
        >
          <Slider
            value={time}
            min={0}
            max={1}
            classes={{
              track: classes.timeSliderTrack,
              thumb: classes.timeSliderThumb
            }}
            id="test2"
            onChange={(_, value) => {
              editor.currentChart!.setTime(
                value * editor.currentChart!.audio!.duration(),
                true
              );
            }}
          />
        </div>

        <div style={{ background: "#000", marginTop: "-14px" }}>
          {!isPlaying ? (
            <IconButton
              style={{ color: "#fff" }}
              className={classes.playerButton}
              aria-label=""
              onClick={() => {
                editor.currentChart!.play();
              }}
            >
              <PlayArrow />
            </IconButton>
          ) : (
            <IconButton
              style={{ color: "#fff" }}
              className={classes.playerButton}
              aria-label=""
              onClick={() => {
                editor.currentChart!.pause();
              }}
            >
              <PauseIcon />
            </IconButton>
          )}

          <IconButton
            style={{ color: "#fff" }}
            className={classes.playerButton}
            aria-label="Delete"
          >
            <SpeakerIcon />
          </IconButton>

          {/* volume */}
          <Slider
            value={safe(() => editor!.currentChart!.volume, 0)}
            min={0}
            max={1}
            style={{
              marginBottom: "4px",
              marginRight: "2rem",
              width: "100px",
              display: "inline-block"
            }}
            classes={{
              track: classes.volumeSliderTrack,
              thumb: classes.volumeSliderThumb
            }}
            onChange={(_, value) => {
              editor!.currentChart!.setVolume(value);
            }}
          />

          <span style={{ color: "#fff" }}>
            {this.formatTime(
              safe(() => editor.currentChart!.audioBuffer!.duration * time)
            )}
            {" / "}
            {this.formatTime(
              safe(() => editor.currentChart!.audioBuffer!.duration)
            )}
          </span>

          <Slider
            value={safe(() => editor!.currentChart!.speed, 0)}
            min={0.1}
            max={1}
            step={0.1}
            style={{
              marginBottom: "4px",
              marginLeft: "1rem",
              width: "100px",
              display: "inline-block"
            }}
            classes={{
              track: classes.volumeSliderTrack,
              thumb: classes.volumeSliderThumb
            }}
            onChange={(_, value) => {
              editor!.currentChart!.setSpeed(value);
            }}
          />

          <IconButton
            id="notes"
            style={{ color: "#fff", float: "right" }}
            className={classes.playerButton}
            onClick={() => this.setState({ openInformation: true })}
          >
            <NotesIcon />
          </IconButton>
          <IconButton
            style={{ color: "#fff", float: "right" }}
            className={classes.playerButton}
            aria-label=""
          >
            <SettingsIcon />
          </IconButton>

          <ChartInformation
            chart={editor.currentChart!}
            open={this.state.openInformation}
            onClose={() => this.setState({ openInformation: false })}
            anchorEl={document.querySelector("#notes")! as HTMLElement}
          />
        </div>
      </div>
    );
  }
}

export default withStyles(styles)(Player);
