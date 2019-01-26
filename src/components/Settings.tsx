import {
  createStyles,
  Divider,
  ExpansionPanel,
  ExpansionPanelDetails,
  ExpansionPanelSummary,
  withStyles,
  WithStyles
} from "@material-ui/core";
import { Theme } from "@material-ui/core/styles/createMuiTheme";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import * as React from "react";
import AssetSetting from "../containers/AssetSetting";
import ChartSetting from "../containers/ChartSetting";
import EditorSetting from "../containers/EditorSetting";

const styles = (theme: Theme) =>
  createStyles({
    summary: {
      fontSize: "14px"
    },

    root: {
      boxShadow: "none"
    },
    test: {
      boxShadow: "none",
      margin: 0
    }
  });

interface IProps extends WithStyles<typeof styles> {}

/**
 * Settings Component
 */
export default withStyles(styles)((props: IProps) => {
  const { classes } = props;

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
      render: () => <AssetSetting />
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
});
