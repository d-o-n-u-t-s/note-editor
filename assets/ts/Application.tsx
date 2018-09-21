import * as React from "react";
import { AppBar, Drawer, Divider, IconButton } from "@material-ui/core";

import { Theme } from "@material-ui/core/styles/createMuiTheme";

import classNames from "classnames";

import { withStyles, WithStyles, createStyles } from "@material-ui/core";

import Pixi from "./Pixi";
import Inspector from "./Inspector";

import Player from "./Player";

import config from "./config";

const drawerWidth: number = config.sidebarWidth;

const styles = (theme: Theme) =>
  createStyles({
    root: {
      /* ... */
    },

    drawerPaper: {
      position: "relative",
      width: drawerWidth
    },
    button: {
      margin: theme.spacing.unit
    },

    playerButton: {},

    fab: {
      position: "absolute",
      top: theme.spacing.unit * 0.5,
      right: theme.spacing.unit * 2,
      zIndex: 10000
    },

    appFrame: {
      zIndex: 1,
      overflow: "hidden",
      position: "relative",
      display: "flex",
      width: "100%"
    },
    appBar: {
      width: `calc(100% - ${drawerWidth}px)`
    },
    "appBar-left": {
      marginLeft: drawerWidth
    },
    toolbar: theme.mixins.toolbar,

    paper: {
      /* ... */
    },

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
    },

    content: {
      flexGrow: 1,
      backgroundColor: theme.palette.background.default
      // padding: theme.spacing.unit * 3
    }
  });

import { Editor } from "./stores/EditorStore";

interface Props extends WithStyles<typeof styles> {
  editor?: Editor;
}

import Menu from "./EditorSetting";
import { Provider, inject, observer } from "mobx-react";

import stores from "./stores/EditorStore";
import { observable } from "mobx";
import Slider from "@material-ui/lab/Slider";

import ChartTab from "./Tab";

import Toolbar from "./Toolbar";
import Sidebar from "./Sidebar";
import Settings from "./Settings";
import { Button } from "@material-ui/core";

import AddIcon from "@material-ui/icons/Add";

class Application extends React.Component<Props, {}> {
  state = {
    hV: 0,
    vV: 0,

    tabIndex: 0
  };

  componentDidMount() {
    /*
    setInterval(() => {
      var t = document.querySelector("#test") as HTMLDivElement;

      t.style.height =
        (t.parentElement as HTMLDivElement).offsetHeight - 16 + "px";

      var t2 = document.querySelector("#test") as HTMLDivElement;
      /*
      t2.style.width =
        (t2.parentElement as HTMLDivElement).offsetWidth - 16 + "px";
        */
    /*
    }, 100);
    */
  }

  render() {
    const { classes } = this.props;

    return (
      <Provider {...stores}>
        <div style={{ flexGrow: 1 }}>
          <div className={classes.appFrame}>
            <AppBar
              position="absolute"
              color="default"
              className={classNames(classes.appBar, classes[`appBar-left`])}
            >
              <Toolbar />
              <Divider />
              <ChartTab />
            </AppBar>

            <Drawer
              variant="permanent"
              classes={{
                paper: classes.drawerPaper
              }}
              anchor="left"
            >
              <Settings />
              <Sidebar />
              <Inspector target={{ a: 0, b: "b" }} />

              <Button
                color="primary"
                variant="fab"
                aria-label="Add"
                onClick={() => location.reload()}
              >
                reload
              </Button>
            </Drawer>

            <main
              className={classes.content}
              style={{ display: "flex", flexDirection: "column" }}
            >
              <div
                className={classes.toolbar}
                style={{ marginBottom: "25px" }}
              />

              <div style={{ flex: 1, display: "flex" }}>
                <Pixi />
                {/*}
                <div style={{ display: "flex" }}>
                  <Slider
                    id="test"
                    value={this.state.hV}
                    min={0}
                    max={1}
                    onChange={(_, value) => {
                      this.setState({ hV: value });
                    }}
                    vertical
                  />
                </div>
                */}
              </div>
              <Player />
            </main>
          </div>
        </div>
      </Provider>
    );
  }
}

export default withStyles(styles)(Application);
