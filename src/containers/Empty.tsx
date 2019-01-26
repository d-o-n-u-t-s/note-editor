import { withStyles, WithStyles } from "@material-ui/core";
import * as React from "react";
import NewChartDialog from "../components/NewChartDialog";
import styles from "../styles/styles";

interface IProps extends WithStyles<typeof styles> {}

export default withStyles(styles)((props: IProps) => (
  <div>
    譜面が存在しません
    <br />
    <NewChartDialog />
  </div>
));
