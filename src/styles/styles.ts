import { createStyles, makeStyles, Theme } from "@material-ui/core";

export const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    input: {
      fontSize: 14,
      marginTop: -4,
    },
    label: {
      fontSize: 16,
    },
    table: {
      outline: 0,
      padding: theme.spacing(2),
    },
  })
);
