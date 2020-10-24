import {
  AppBar,
  createStyles,
  Divider,
  Drawer,
  makeStyles,
  MuiThemeProvider,
} from "@material-ui/core";
import { createMuiTheme } from "@material-ui/core/styles";
import { Theme } from "@material-ui/core/styles/createMuiTheme";
import classNames from "classnames";
import { observer, Provider } from "mobx-react";
import { SnackbarProvider } from "notistack";
import * as React from "react";
import Notification from "../components/Notification";
import Settings from "../components/Settings";
import config from "../config";
import stores, { useStores } from "../stores/stores";
import ChartEditor from "./ChartEditor";
import ChartTab from "./ChartTab";
import Inspector from "./Inspector";
import Layer from "./Layer";
import Player from "./Player";
import Toolbar from "./Toolbar";

const drawerWidth: number = config.sidebarWidth;
const rightDrawerWidth = 180;

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      display: "flex",
    },
    leftDrawer: {
      width: drawerWidth,
      flexShrink: 0,
    },
    leftDrawerPaper: {
      width: drawerWidth,
    },
    rightDrawer: {
      width: rightDrawerWidth,
      flexShrink: 0,
      zIndex: 0,
    },
    rightDrawerPaper: {
      width: rightDrawerWidth,
    },
    button: {
      margin: theme.spacing(),
    },
    fab: {
      position: "absolute",
      top: theme.spacing(0.5),
      right: theme.spacing(2),
      zIndex: 10000,
    },
    appFrame: {
      zIndex: 1,
      overflow: "hidden",
      position: "relative",
      display: "flex",
      width: "100%",
    },
    appBarOpen: {
      width: `calc(100% - ${drawerWidth}px)`,
    },
    appBarClose: {
      width: "100%",
    },
    appBarLeftOpen: {
      marginLeft: drawerWidth,
    },
    appBarLeftClose: {
      marginLeft: 0,
    },
    toolbar: theme.mixins.toolbar,
    timeSliderTrack: {
      height: "4px",
      background: "red",
    },
    timeSliderThumb: {
      width: "14px",
      height: "14px",
      background: "red",
    },
    volumeSliderTrack: {
      height: "4px",
      background: "#fff",
    },
    volumeSliderThumb: {
      width: "14px",
      height: "14px",
      background: "#fff",
    },
    chartEditorContainer: {
      flex: 1,
      overflow: "hidden",
    },
    content: {
      flexGrow: 1,
      display: "flex",
      flexDirection: "column",
      backgroundColor: theme.palette.background.default,
      height: "100vh",
    },
  })
);

const lightTheme = createMuiTheme({
  palette: {
    type: "light",
  },
});
const darkTheme = createMuiTheme({
  palette: {
    type: "dark",
  },
});

const Application = observer(function Application() {
  const classes = useStyles();
  const { editor } = useStores();

  const appBarHeight = editor.setting.tabHeight + 48;

  return (
    <div className={classes.root}>
      <AppBar
        position="absolute"
        color="default"
        className={classNames(classes.appBarOpen, classes.appBarLeftOpen)}
      >
        <Toolbar />
        <Divider />
        <ChartTab />
      </AppBar>
      <Drawer
        className={classes.leftDrawer}
        variant="permanent"
        classes={{
          paper: classes.leftDrawerPaper,
        }}
        anchor="left"
      >
        <Settings />
        <Inspector />
      </Drawer>
      <main className={classes.content}>
        <div
          style={{
            marginTop: appBarHeight,
          }}
        />
        <div className={classes.chartEditorContainer}>
          <ChartEditor />
        </div>
        <Player />
      </main>
      <Drawer
        className={classes.rightDrawer}
        variant="permanent"
        classes={{
          paper: classes.rightDrawerPaper,
        }}
        anchor="right"
      >
        <div
          style={{
            marginTop: appBarHeight,
          }}
        />
        <Layer />
      </Drawer>
      <SnackbarProvider maxSnack={4}>
        <Notification />
      </SnackbarProvider>
    </div>
  );
});

const ThemeProvider = observer(function ThemeProvider() {
  const { editor } = useStores();
  return (
    <MuiThemeProvider
      theme={editor.setting.muiThemeType === "light" ? lightTheme : darkTheme}
    >
      <Application />
    </MuiThemeProvider>
  );
});

export default function ApplicationProvider() {
  return (
    <Provider {...stores}>
      <ThemeProvider />
    </Provider>
  );
}
