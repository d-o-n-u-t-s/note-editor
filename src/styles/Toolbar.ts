import { createStyles, makeStyles, Theme } from "@material-ui/core";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    toggleButton: {
      height: 32,
    },
    toggleContainer: {
      padding: `${theme.spacing()}px ${theme.spacing(2)}px`,
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-start",
    },
  })
);

export default useStyles;
