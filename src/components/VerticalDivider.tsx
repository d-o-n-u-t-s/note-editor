import { createStyles, makeStyles } from "@material-ui/core";
import { Theme } from "@material-ui/core/styles/createMuiTheme";
import * as React from "react";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    divider: {
      width: 1,
      background: theme.palette.divider,
    },
  })
);

export default function VerticalDivider() {
  const classes = useStyles();
  return <div className={classes.divider} />;
}
