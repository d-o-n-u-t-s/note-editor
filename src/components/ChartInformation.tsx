import {
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@material-ui/core";
import Popover from "@material-ui/core/Popover";
import FileCopyIcon from "@material-ui/icons/FileCopy";
import TextRotateVerticalIcon from "@material-ui/icons/TextRotateVertical";
import TextRotationNoneIcon from "@material-ui/icons/TextRotationNone";
import { clipboard } from "electron";
import * as _ from "lodash";
import { observer } from "mobx-react";
import React, { useState } from "react";
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
  const [smallMode, setSmallMode] = useState(false);
  const chart = editor.currentChart;

  if (!chart) return <div />;

  function renderTable() {
    if (!chart || !props.open) return <div />;

    // type でグループ化したノーツ
    const getGroup = chart.musicGameSystem.eventListeners.getGroup;
    let groups = Object.entries(
      _.groupBy(
        chart.timeline.notes,
        getGroup ? (n) => getGroup(n, chart) : "type"
      )
    ).sort();

    const noteInformation = chart.musicGameSystem.eventListeners.getNoteInformation?.(
      groups
    );

    // 並び替え
    groups = noteInformation?.sortedNoteTypeGroups ?? groups;

    function handleCopy() {
      const text = noteInformation?.getClipboardText?.();
      if (!text) return;
      clipboard.writeText(text);
    }

    const cellStyle = smallMode
      ? {
          maxWidth: "1rem",
          lineHeight: "1rem",
        }
      : {};

    return (
      <Table className={classes.table} size="small">
        <TableHead>
          <TableRow>
            <TableCell align="right" style={cellStyle}>
              合計
            </TableCell>
            {groups.map(([key, _]) => (
              <TableCell align="right" key={key} style={cellStyle}>
                {key}
              </TableCell>
            ))}
            <TableCell>
              <IconButton
                onClick={() => {
                  props.onClose();
                  setSmallMode(!smallMode);
                }}
                style={{ margin: 0 }}
              >
                {smallMode ? (
                  <TextRotationNoneIcon fontSize="small" />
                ) : (
                  <TextRotateVerticalIcon fontSize="small" />
                )}
              </IconButton>
            </TableCell>
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
            <TableCell>
              <IconButton
                disabled={!noteInformation}
                onClick={handleCopy}
                style={{ margin: 0 }}
              >
                <FileCopyIcon fontSize="small" />
              </IconButton>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
  }

  return (
    <Popover
      open={props.open}
      onClose={props.onClose}
      anchorEl={props.anchorEl}
    >
      {renderTable()}
    </Popover>
  );
});
