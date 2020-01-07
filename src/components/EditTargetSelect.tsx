import { TextField } from "@material-ui/core";
import ArrowDropDownIcon from "@material-ui/icons/ArrowDropDown";
import ToggleButton from "@material-ui/lab/ToggleButton";
import ToggleButtonGroup from "@material-ui/lab/ToggleButtonGroup";
import * as React from "react";
import { ObjectCategory } from "../stores/EditorSetting";
import MusicGameSystem from "../stores/MusicGameSystem";
import useStyles from "../styles/ToolBar";

export default function EditTargetSelect({
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

  const noteDisabled = musicGameSystem.noteTypes.length === 0;
  const laneDisabled = musicGameSystem.laneTemplates.length === 0;
  const otherDisabled = musicGameSystem.otherObjectTypes.length === 0;

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
        {/* Note */}
        <ToggleButton
          className={classes.toggleButton}
          value={ObjectCategory.Note}
          disabled={noteDisabled}
        >
          {musicGameSystem.noteTypes[editNoteTypeIndex]?.name}
          <ArrowDropDownIcon onClick={e => onNote(e.currentTarget)} />
        </ToggleButton>
        {/* Lane */}
        <ToggleButton
          className={classes.toggleButton}
          value={ObjectCategory.Lane}
          disabled={laneDisabled}
        >
          {musicGameSystem.laneTemplates[editLaneTypeIndex]?.name}
          <ArrowDropDownIcon onClick={e => onLane(e.currentTarget)} />
        </ToggleButton>
        {/* Other */}
        <ToggleButton
          className={classes.toggleButton}
          value={ObjectCategory.Other}
          disabled={otherDisabled}
        >
          {otherDisabled ? null : (
            <span>
              {musicGameSystem.otherObjectTypes[editOtherTypeIndex]?.name}
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
                style={{ height: 24 }}
                onChange={({ target: { value } }) =>
                  onOtherValueChange(Number(value))
                }
              />
            </span>
          )}
          <ArrowDropDownIcon onClick={e => onOther(e.currentTarget)} />
        </ToggleButton>
      </ToggleButtonGroup>
    </div>
  );
}
