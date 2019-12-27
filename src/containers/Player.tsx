import {
  createStyles,
  IconButton,
  Slider,
  withStyles,
  WithStyles
} from "@material-ui/core";
import { Theme } from "@material-ui/core/styles/createMuiTheme";
import NotesIcon from "@material-ui/icons/Notes";
import PauseIcon from "@material-ui/icons/Pause";
import PlayArrow from "@material-ui/icons/PlayArrow";
import SettingsIcon from "@material-ui/icons/Settings";
import SpeedIcon from "@material-ui/icons/Speed";
import SeVolumeIcon from "@material-ui/icons/SurroundSound";
import SpeakerIcon from "@material-ui/icons/VolumeUp";
import { observer } from "mobx-react";
import * as React from "react";
import ChartInformation from "../components/ChartInformation";
import { inject, InjectedComponent } from "../stores/inject";

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

const TimeSlider = (props: Props & { time: number; onChange: any }) => (
  <Slider
    value={props.time}
    min={0}
    max={1}
    classes={{
      track: props.classes.timeSliderTrack,
      thumb: props.classes.timeSliderThumb
    }}
    onChange={props.onChange}
  />
);

@inject
@observer
class Player extends InjectedComponent<Props> {
  state = {
    openInformation: false
  };

  private formatTime(time: number) {
    const sec = Math.floor(time % 60);
    const min = Math.floor(time / 60);

    return `${min}:${sec.toString().padStart(2, "0")}`;
  }

  render() {
    const editor = this.injected.editor;

    if (
      !editor ||
      !editor.currentChart ||
      !editor.currentChart!.audio ||
      !editor.currentChart!.audioBuffer
    )
      return <div />;

    const chart = editor.currentChart!;

    const { classes } = this.props;

    const time =
      editor.currentChart!.time / editor.currentChart!.audio!.duration();

    return (
      <div
        style={{
          marginTop: "calc((62px - 48px) * -1)"
        }}
      >
        <div
          style={{
            display: "flex",
            background: "#000",
            margin: "0 14px"
          }}
        >
          <TimeSlider
            time={time}
            classes={classes}
            onChange={(_: any, value: any) => {
              editor.currentChart!.setTime(
                value * editor.currentChart!.audio!.duration(),
                true
              );
            }}
          />
        </div>

        <div style={{ background: "#000", marginTop: "-14px" }}>
          {!chart.isPlaying ? (
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

          <span style={{ color: "#fff" }}>
            {this.formatTime(chart.audioBuffer!.duration * time)}
            {" / "}
            {this.formatTime(chart.audioBuffer!.duration)}
          </span>

          <IconButton
            style={{ color: "#fff" }}
            className={classes.playerButton}
            aria-label="Delete"
          >
            <SpeakerIcon />
          </IconButton>

          {/* volume */}
          <Slider
            value={chart.volume}
            min={0}
            max={1}
            style={{
              marginBottom: "-10px",
              marginRight: "10px",
              width: "100px",
              display: "inline-block"
            }}
            classes={{
              track: classes.volumeSliderTrack,
              thumb: classes.volumeSliderThumb
            }}
            onChange={(_, value) => {
              editor!.currentChart!.setVolume(value as number);
            }}
          />

          <IconButton
            style={{ color: "#fff" }}
            className={classes.playerButton}
          >
            <SpeedIcon />
          </IconButton>

          <Slider
            value={chart.speed}
            min={0.1}
            max={1}
            step={0.1}
            style={{
              marginBottom: "-10px",
              marginRight: "10px",
              width: "100px",
              display: "inline-block"
            }}
            classes={{
              track: classes.volumeSliderTrack,
              thumb: classes.volumeSliderThumb
            }}
            onChange={(_, value) => {
              chart.setSpeed(value as number);
            }}
          />

          <IconButton
            style={{ color: "#fff" }}
            className={classes.playerButton}
          >
            <SeVolumeIcon />
          </IconButton>

          <Slider
            value={chart.seVolume}
            min={0}
            max={1}
            step={0.1}
            style={{
              marginBottom: "-10px",
              marginRight: "10px",
              width: "100px",
              display: "inline-block"
            }}
            classes={{
              track: classes.volumeSliderTrack,
              thumb: classes.volumeSliderThumb
            }}
            onChange={(_, value) => {
              chart.setSeVolume(value as number);
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
