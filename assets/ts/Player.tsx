import * as React from "react";
import { observer, inject } from "mobx-react";
import { Theme } from "@material-ui/core/styles/createMuiTheme";
import { withStyles, WithStyles, createStyles } from "@material-ui/core";
import Slider from "@material-ui/lab/Slider";
import PlayArrow from "@material-ui/icons/PlayArrow";
import PauseIcon from "@material-ui/icons/Pause";
import SpeakerIcon from "@material-ui/icons/VolumeUp";
import SettingsIcon from "@material-ui/icons/Settings";
import NotesIcon from "@material-ui/icons/Notes";
import { IconButton } from "@material-ui/core";
import { Editor } from "./stores/EditorStore";

import { safe } from "../ts/util";

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

interface Props extends WithStyles<typeof styles> {
  editor?: Editor;
}

@inject("editor")
@observer
class Player extends React.Component<Props, {}> {
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

  private formatTime(time: number) {
    const sec = Math.floor(time % 60);
    const min = Math.floor(time / 60);

    return `${min}:${sec.toString().padStart(2, "0")}`;
  }

  render() {
    const editor = this.props.editor;

    const { classes } = this.props;

    const isPlaying = safe(
      () => this.props.editor!.currentChart!.isPlaying,
      false
    );

    const time = safe(
      () =>
        this.props.editor!.currentChart!.time /
        this.props.editor!.currentChart!.audio!.duration(),
      0
    );

    return (
      <div>
        <div
          style={{
            display: "flex",
            background: "#000",
            // marginRight: "32px",
            marginTop: "-14px"
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
              console.log("TimeChange!", _);

              this.props.editor!.currentChart!.setTime(
                value * this.props.editor!.currentChart!.audio!.duration(),
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
                this.props.editor!.currentChart!.play();
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
                this.props.editor!.currentChart!.pause();
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
            value={safe(() => editor!.currentChart!.volume)}
            min={0}
            max={1}
            style={{
              width: "100px",
              display: "inline-block",
              marginBottom: "-12px"
            }}
            classes={{
              track: classes.volumeSliderTrack,
              thumb: classes.volumeSliderThumb
            }}
            onChange={(_, value) => {
              editor!.currentChart!.setVolume(value);
            }}
          />

          <span style={{ color: "#fff", fontFamily: "Roboto" }}>
            {this.formatTime(
              safe(
                () =>
                  this.props.editor!.currentChart!.audioBuffer!.duration * time
              )
            )}
            {" / "}
            {this.formatTime(
              safe(() => this.props.editor!.currentChart!.audioBuffer!.duration)
            )}
          </span>

          <IconButton
            style={{ color: "#fff", float: "right" }}
            className={classes.playerButton}
            aria-label=""
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
        </div>
      </div>
    );
  }
}

export default withStyles(styles)(Player);
