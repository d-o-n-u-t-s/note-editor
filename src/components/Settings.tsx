import {
  createStyles,
  Divider,
  ExpansionPanel,
  ExpansionPanelDetails,
  ExpansionPanelSummary,
  makeStyles
} from "@material-ui/core";
import { Theme } from "@material-ui/core/styles/createMuiTheme";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import * as React from "react";
import AssetSetting from "../containers/AssetSetting";
import ChartSetting from "../containers/ChartSetting";
import EditorSetting from "../containers/EditorSetting";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    panel: {
      boxShadow: "none",
      marginBottom: "0 !important"
    },
    panelSummary: {
      fontSize: 14
    },
    panelDetails: {
      background: theme.palette.background.default,
      borderTop: `solid 1px ${theme.palette.divider}`
    }
  })
);

/**
 * Settings Component
 */
export default function Settings() {
  const classes = useStyles();

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
    <>
      {settings.map((setting, index) => (
        <div key={index}>
          <ExpansionPanel className={classes.panel}>
            <ExpansionPanelSummary
              expandIcon={<ExpandMoreIcon />}
              className={classes.panelSummary}
            >
              {setting.key}
            </ExpansionPanelSummary>
            <ExpansionPanelDetails className={classes.panelDetails}>
              {setting.render()}
            </ExpansionPanelDetails>
          </ExpansionPanel>
          <Divider />
        </div>
      ))}
    </>
  );
}
