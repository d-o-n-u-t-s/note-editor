import {
  Menu,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow
} from "@material-ui/core";
import * as _ from "lodash";
import { observer } from "mobx-react";
import * as React from "React";
import { useStores } from "../stores/stores";
import { useStyles } from "../styles/styles";

interface IProps {
  open: boolean;
  onClose: any;
  anchorEl: HTMLElement;
}

export default observer(function ChartInformation(props: IProps) {
  const { editor } = useStores();
  const classes = useStyles();
  const chart = editor.currentChart;

  if (!chart) return <div />;

  function renderTable() {
    if (!chart || !props.open) return <div />;

    // type でグループ化したノーツ
    const getGroup = chart.musicGameSystem.eventListeners.getGroup;
    const groups = Object.entries(
      _.groupBy(
        chart.timeline.notes,
        getGroup ? n => getGroup(n, chart) : "type"
      )
    ).sort();

    return (
      <Table className={classes.table}>
        <TableHead>
          <TableRow>
            <TableCell>合計</TableCell>
            {groups.map(([key, _]) => (
              <TableCell align="right" key={key}>
                {key}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell>{chart.timeline.notes.length}</TableCell>
            {groups.map(([key, notes]) => (
              <TableCell align="right" key={key}>
                {notes.length}
              </TableCell>
            ))}
          </TableRow>
        </TableBody>
      </Table>
    );
  }

  return (
    <Menu open={props.open} onClose={props.onClose} anchorEl={props.anchorEl}>
      {renderTable()}
    </Menu>
  );
});
