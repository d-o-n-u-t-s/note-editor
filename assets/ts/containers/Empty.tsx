import * as React from "react";

import { observer, inject } from "mobx-react";
import { Theme } from "@material-ui/core/styles/createMuiTheme";

import NewChartDialog from "../components/NewChartDialog";

import Editor from "../stores/EditorStore";
import {
  withStyles,
  WithStyles,
  createStyles,
  Divider,
  Menu,
  MenuItem,
  FormGroup
} from "@material-ui/core";

import FormControlLabel from "@material-ui/core/FormControlLabel";
import Switch from "@material-ui/core/Switch";

import ToggleButton from "@material-ui/lab/ToggleButton";
import ToggleButtonGroup from "@material-ui/lab/ToggleButtonGroup";

import { IconButton, Badge, Tab } from "@material-ui/core";
import AddIcon from "@material-ui/icons/Add";
import MenuIcon from "@material-ui/icons/menu";
import CreateIcon from "@material-ui/icons/create";
import ClearIcon from "@material-ui/icons/clear";
import ArrowUpwardIcon from "@material-ui/icons/ArrowUpward";
import ArrowDropDownIcon from "@material-ui/icons/ArrowDropDown";
import ShowChartIcon from "@material-ui/icons/ShowChart";
import VisibilityIcon from "@material-ui/icons/Visibility";

const styles = (theme: Theme) => createStyles({});

interface Props extends WithStyles<typeof styles> {
  editor?: Editor;
}

@inject("editor")
@observer
class Empty extends React.Component<Props, {}> {
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
