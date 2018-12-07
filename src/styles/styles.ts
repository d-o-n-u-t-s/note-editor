import { createStyles, Theme } from "@material-ui/core";

export default (theme: Theme) =>
  createStyles({
    input: {
      fontSize: 14,
      marginTop: -4
    },
    label: {
      fontSize: 16
    },

    rightDrawer: {
      marginTop: 97,
      zIndex: 0,
      position: "relative",
      width: 180
    }
  });
