import * as React from "react";

import { observer, inject } from "mobx-react";
import { Theme } from "@material-ui/core/styles/createMuiTheme";
import { safe } from "../ts/util";

import NewChartDialog from "./components/NewChartDialog";

import { Editor } from "./stores/EditorStore";
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

/**
 * 編集モード
 */
enum EditMode {
  Select = 1,
  Add,
  Delete,
  Connect
}

/**
 *
 */
enum ObjectCategory {
  // ノート
  Note = 1,
  // レーン
  Lane,
  // 特殊
  S
}

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

const styles = (theme: Theme) =>
  createStyles({
    badge: {
      top: 13,
      right: -8,

      border: `2px solid ${
        theme.palette.type === "light"
          ? theme.palette.grey[200]
          : theme.palette.grey[900]
      }`
    },

    displaySetting: {
      outline: 0,
      padding: theme.spacing.unit * 2
    },

    toggleContainer: {
      // height: 56,
      padding: `${theme.spacing.unit}px ${theme.spacing.unit * 2}px`,
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-start"
      // margin: `${theme.spacing.unit}px 0`,
      // background: theme.palette.background.default
    }
  });

interface Props extends WithStyles<typeof styles> {
  editor?: Editor;
}

interface INoteType {
  name: string;
}

@inject("editor")
@observer
class Toolbar extends React.Component<Props, {}> {
  state = {
    // タイムライン上に配置するオブジェクトのサイズ
    timelineDivisionSize: 1,
    // レーン上に配置するオブジェクのサイズ
    laneDivisionSize: 1,

    laneAnchorEl: null,
    noteAnchorEl: null,

    objectSizeAnchorEl: null,

    displaySettingAnchorEl: null,

    anchorEl: null
  };

  handleClick = (event: any) => {
    this.setState({ anchorEl: event.currentTarget });
  };

  handleClose = () => {
    this.setState({ anchorEl: null });
  };
  render() {
    const editor = this.props.editor;
    const { anchorEl } = this.state;

    const { classes } = this.props;

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "row"
          //margin: "-12px 0"
        }}
      >
        <Badge
          badgeContent={this.props.editor!.setting!.measureDivision}
          color="primary"
          classes={{ badge: this.props.classes.badge }}
        >
          <IconButton aria-label="Delete" onClick={this.handleClick}>
            <MenuIcon />
          </IconButton>
        </Badge>

        <Badge
          badgeContent={this.props.editor!.setting!.objectSize}
          color="primary"
          classes={{ badge: this.props.classes.badge }}
        >
          <IconButton
            aria-label="Delete"
            onClick={e =>
              this.setState({ objectSizeAnchorEl: e.currentTarget })
            }
          >
            <MenuIcon />
          </IconButton>
        </Badge>

        <Menu
          id="simple-menu"
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={this.handleClose}
        >
          {[1, 2, 3, 4, 8, 16, 32, 64].map((value, index) => (
            <MenuItem
              key={index}
              onClick={(e: any) => {
                this.props.editor!.setting!.setMeasureDivision(value);
                this.handleClose();
              }}
            >
              {value}
            </MenuItem>
          ))}
        </Menu>

        {/* 配置オブジェクトサイズ */}
        <Menu
          anchorEl={this.state.objectSizeAnchorEl}
          open={Boolean(this.state.objectSizeAnchorEl)}
          onClose={() => this.setState({ objectSizeAnchorEl: null })}
        >
          {Array.from({ length: 16 })
            .fill(0)
            .map((_, index) => index + 1)
            .map((value, index) => (
              <MenuItem
                key={index}
                onClick={(e: any) => {
                  this.props.editor!.setting!.setObjectSize(value);
                  this.setState({ objectSizeAnchorEl: null });
                }}
              >
                {value}
              </MenuItem>
            ))}
        </Menu>

        <div className={classes.toggleContainer}>
          <ToggleButtonGroup
            value={this.props.editor!.setting!.editMode}
            exclusive
            onChange={(_, value: EditMode | null) => {
              if (value === null) return;
              this.props.editor!.setting!.setEditMode(value);
            }}
          >
            <ToggleButton value={EditMode.Select}>
              <ArrowUpwardIcon />
            </ToggleButton>
            <ToggleButton value={EditMode.Add}>
              <CreateIcon />
            </ToggleButton>
            <ToggleButton value={EditMode.Delete}>
              <ClearIcon />
            </ToggleButton>
            <ToggleButton value={EditMode.Connect}>
              <ShowChartIcon />
            </ToggleButton>
          </ToggleButtonGroup>
        </div>

        <div className={classes.toggleContainer}>
          <ToggleButtonGroup
            value={this.props.editor!.setting!.editObjectCategory}
            exclusive
            onChange={(_, value: ObjectCategory | null) => {
              if (value === null) return;
              this.props.editor!.setting!.setEditObjectCategory(value);
            }}
          >
            <ToggleButton value={ObjectCategory.Note}>
              {safe(
                () =>
                  this.props.editor!.currentChart!.musicGameSystem!.noteTypes[
                    this.props.editor!.setting!.editNoteTypeIndex
                  ].name
              )}
              <ArrowDropDownIcon
                onClick={(e: any) =>
                  this.setState({ noteAnchorEl: e.currentTarget })
                }
              />
            </ToggleButton>
            <ToggleButton value={ObjectCategory.Lane}>
              {safe(
                () =>
                  this.props.editor!.currentChart!.musicGameSystem!
                    .laneTemplates[
                    this.props.editor!.setting!.editLaneTypeIndex
                  ].name
              )}
              <ArrowDropDownIcon
                onClick={(e: any) =>
                  this.setState({ laneAnchorEl: e.currentTarget })
                }
              />
            </ToggleButton>
            <ToggleButton value={ObjectCategory.S}>
              {/*<ClearIcon />*/}
              BPM
              <ArrowDropDownIcon onClick={this.handleClick} />
            </ToggleButton>
          </ToggleButtonGroup>
        </div>

        {/* 配置ノートタイプ */}
        <Menu
          anchorEl={this.state.noteAnchorEl}
          open={Boolean(this.state.noteAnchorEl)}
          onClose={(e: any) => {
            this.setState({ noteAnchorEl: null });
          }}
        >
          {(() => {
            if (!this.props.editor!.currentChart!.musicGameSystem) return;
            return this.props.editor!.currentChart!.musicGameSystem!.noteTypes.map(
              ({ name }, index) => (
                <MenuItem
                  key={index}
                  onClick={() => {
                    this.props.editor!.setting!.setEditNoteTypeIndex(index);
                    this.setState({ noteAnchorEl: null });
                  }}
                >
                  {name}
                </MenuItem>
              )
            );
          })()}
        </Menu>

        {/* 配置レーンタイプ */}
        <Menu
          anchorEl={this.state.laneAnchorEl}
          open={Boolean(this.state.laneAnchorEl)}
          onClose={(e: any) => {
            this.setState({ laneAnchorEl: null });
          }}
        >
          {(() => {
            if (!this.props.editor!.currentChart!.musicGameSystem) return;
            return this.props.editor!.currentChart!.musicGameSystem!.laneTemplates.map(
              ({ name }, index) => (
                <MenuItem
                  key={index}
                  onClick={() => {
                    this.props.editor!.setting!.setEditLaneTypeIndex(index);
                    this.setState({ laneAnchorEl: null });
                  }}
                >
                  {name}
                </MenuItem>
              )
            );
          })()}
        </Menu>

        {Array.from({ length: 0 }).map((_, index) => (
          <IconButton key={index} aria-label="Delete">
            <AddIcon />
          </IconButton>
        ))}

        {/* 表示設定 */}
        <IconButton
          onClick={event => {
            this.setState({
              displaySettingAnchorEl: event.currentTarget
            });
          }}
        >
          <VisibilityIcon />
        </IconButton>
        <Menu
          anchorEl={this.state.displaySettingAnchorEl}
          open={Boolean(this.state.displaySettingAnchorEl)}
          onClose={() =>
            this.setState({
              displaySettingAnchorEl: null
            })
          }
        >
          <FormGroup className={classes.displaySetting}>
            {[
              ["レーン中間ポイント", "lanePoint"],
              ["レーン", "b"],
              ["ノート", "b"]
            ].map(([label, key], index) => (
              <FormControlLabel
                key={index}
                control={
                  <Switch
                    onChange={(_, v) => {
                      this.props.editor!.setting!.setObjectVisibility({
                        [key]: v
                      });
                    }}
                    checked={
                      (this.props.editor!.setting!.objectVisibility as any)[key]
                    }
                  />
                }
                label={label}
              />
            ))}
          </FormGroup>
        </Menu>

        <NewChartDialog />
      </div>
    );
  }
}

export default withStyles(styles)(Toolbar);
