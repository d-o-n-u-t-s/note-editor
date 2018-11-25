import {
  AppBar,
  createStyles,
  Divider,
  Drawer,
  withStyles,
  WithStyles
} from "@material-ui/core";
import { Theme } from "@material-ui/core/styles/createMuiTheme";
import classNames from "classnames";
import { inject, observer, Provider } from "mobx-react";
import * as React from "react";
import config from "../config";
import Editor from "../stores/EditorStore";
import stores from "../stores/stores";
import Empty from "./Empty";
import Inspector from "./Inspector";
import Pixi from "./Pixi";
import Player from "./Player";
import Settings from "./Settings";
import ChartTab from "./Tab";
import Toolbar from "./Toolbar";

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

interface Props extends WithStyles<typeof styles> {
  editor?: Editor;
}

@inject("editor")
@observer
class T extends React.Component<{ editor?: Editor }, {}> {
  render() {
    if (!this.props.editor || !this.props.editor!.currentChart) {
      return <Empty />;
    }

    return (
      <div style={{ flex: 1, display: "flex" }}>
        <Pixi />
      </div>
    );
  }
}

@inject("editor")
@observer
class T2 extends React.Component<{ editor?: Editor }, {}> {
  render() {
    if (!this.props.editor || !this.props.editor!.currentChart) {
      return <div />;
    }

    return <Player />;
  }
}

class Application extends React.Component<Props, {}> {
  state = {
    hV: 0,
    vV: 0,

    tabIndex: 0
  };

  render() {
    const { classes } = this.props;

    return (
      <Provider {...stores}>
        <div style={{ flexGrow: 1 }}>
          <div className={classes.appFrame} style={{ height: "100vh" }}>
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
              <Inspector />
            </Drawer>

            <main
              className={classes.content}
              style={{ display: "flex", flexDirection: "column" }}
            >
              <div
                className={classes.toolbar}
                style={{ marginBottom: "25px" }}
              />

              <T />
              <T2 />
            </main>
          </div>
        </div>
      </Provider>
    );
  }
}

export default withStyles(styles)(Application);
