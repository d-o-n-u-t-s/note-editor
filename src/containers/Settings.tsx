import * as React from "react";
import { observer, inject } from "mobx-react";
import { Theme } from "@material-ui/core/styles/createMuiTheme";
import {
  ExpansionPanel,
  ExpansionPanelSummary,
  ExpansionPanelDetails,
  withStyles,
  WithStyles,
  createStyles,
  Divider
} from "@material-ui/core";
import Editor from "../stores/EditorStore";

import ExpandMoreIcon from "@material-ui/icons/ExpandMore";

import EditorSetting from "./EditorSetting";
import ChartSetting from "./ChartSetting";
import AssetSetting from "./AssetSetting";

const styles = (theme: Theme) =>
  createStyles({
    summary: {
      fontSize: "14px"
    },

    root: {
      fontFamily: "Roboto",
      boxShadow: "none"
    },
    test: {
      boxShadow: "none",
      margin: 0
    }
  });

interface Props extends WithStyles<typeof styles> {
  editor?: Editor;
}

@inject("editor")
@observer
class Settings extends React.Component<Props, {}> {
  state = {
    vV: 0,
    currentAudio: ""
  };

  handleChange = (event: any) => {
    this.setState({ [event.target.name]: event.target.value });
  };

  private handleChartChange = (_: any, value: number) => {
    this.props.editor!.setCurrentChart(value);
  };

  render() {
    const editor = this.props.editor;

    const { classes } = this.props;

    const settings = [
      {
        key: "譜面設定",
        render: () => <ChartSetting />
      },
      {
        key: "エディタ設定",
        render: () => <EditorSetting />
      },
      {
        key: "アセット設定",
        render: () => <AssetSetting base={0} />
      }
    ];

    return (
      <div>
        {settings.map((setting, index) => (
          <div key={index}>
            <ExpansionPanel
              classes={{
                expanded: classes.test,
                root: classes.root
              }}
            >
              <ExpansionPanelSummary
                expandIcon={<ExpandMoreIcon />}
                className={classes.summary}
              >
                {setting.key}
              </ExpansionPanelSummary>
              <ExpansionPanelDetails
                style={{
                  background: "#f5f5f5",
                  borderTop: "solid 1px #d7d7d7"
                }}
              >
                {setting.render()}
              </ExpansionPanelDetails>
            </ExpansionPanel>
            <Divider />
          </div>
        ))}
      </div>
    );
  }
}

export default withStyles(styles)(Settings);
