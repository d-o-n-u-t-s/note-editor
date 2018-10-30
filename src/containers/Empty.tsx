import { createStyles, withStyles, WithStyles } from "@material-ui/core";
import { Theme } from "@material-ui/core/styles/createMuiTheme";
import { observer } from "mobx-react";
import * as React from "react";
import NewChartDialog from "../components/NewChartDialog";
import { inject, InjectedComponent } from "../stores/inject";

const styles = (theme: Theme) => createStyles({});

interface IProps extends WithStyles<typeof styles> {}

@inject
@observer
class Empty extends InjectedComponent<IProps> {
  render() {
    return (
      <div>
        譜面が存在しません
        <br />
        <NewChartDialog />
      </div>
    );
  }
}

export default withStyles(styles)(Empty);
