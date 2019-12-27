import { TextField } from "@material-ui/core";
import ArrowDropDownIcon from "@material-ui/icons/ArrowDropDown";
import ToggleButton from "@material-ui/lab/ToggleButton";
import ToggleButtonGroup from "@material-ui/lab/ToggleButtonGroup";
import * as React from "react";
import { ObjectCategory } from "../stores/EditorSetting";
import MusicGameSystem from "../stores/MusicGameSystem";
import useStyles from "../styles/ToolBar";

export default function({
  value,
  onChange,
  musicGameSystem,
  editNoteTypeIndex,
  editLaneTypeIndex,
  editOtherTypeIndex,
  otherValue,
  onOtherValueChange,
  onNote,
  onLane,
  onOther
}: {
  value: ObjectCategory;
  onChange: (editObjectCategory: ObjectCategory) => void;
  musicGameSystem: MusicGameSystem;
  editNoteTypeIndex: number;
  editLaneTypeIndex: number;
  editOtherTypeIndex: number;
  otherValue: number;
  onOtherValueChange: (value: number) => void;
  onNote: (el: Element) => void;
  onLane: (el: Element) => void;
  onOther: (el: Element) => void;
}) {
  const classes = useStyles();

  const otherTypes = musicGameSystem.otherObjectTypes;

  return (
    <div className={classes.toggleContainer}>
      <ToggleButtonGroup
        value={value}
        exclusive
        onChange={(_, value: ObjectCategory | null) => {
          if (value === null) return;
          onChange(value);
        }}
      >
        <ToggleButton
          className={classes.toggleButton}
          value={ObjectCategory.Note}
        >
          {musicGameSystem.noteTypes[editNoteTypeIndex].name}
          <ArrowDropDownIcon onClick={(e: any) => onNote(e.currentTarget)} />
        </ToggleButton>
        <ToggleButton
          className={classes.toggleButton}
          value={ObjectCategory.Lane}
        >
          {musicGameSystem.laneTemplates[editLaneTypeIndex].name}
          <ArrowDropDownIcon onClick={(e: any) => onLane(e.currentTarget)} />
        </ToggleButton>
        {/* その他オブジェクトメニュー */}
        <ToggleButton
          className={classes.toggleButton}
          value={ObjectCategory.Other}
        >
          <span>
            {otherTypes[editOtherTypeIndex].name}
            <TextField
              required
              defaultValue={otherValue}
              margin="none"
              type="number"
              InputProps={{
                inputProps: {
                  style: {
                    width: "4rem",
                    marginRight: "-.8rem",
                    textAlign: "center"
                  }
                }
              }}
              style={{ height: "24px" }}
              onChange={({ target: { value } }) =>
                onOtherValueChange(Number(value))
              }
            />
          </span>
          <ArrowDropDownIcon onClick={e => onOther(e.currentTarget)} />
        </ToggleButton>
      </ToggleButtonGroup>
    </div>
  );
}
