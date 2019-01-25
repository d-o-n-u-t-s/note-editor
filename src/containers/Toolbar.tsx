import {
  Badge,
  createStyles,
  FormGroup,
  IconButton,
  Menu,
  MenuItem,
  TextField,
  withStyles,
  WithStyles
} from "@material-ui/core";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import { Theme } from "@material-ui/core/styles/createMuiTheme";
import Switch from "@material-ui/core/Switch";
import AddIcon from "@material-ui/icons/Add";
import ArrowBackIcon from "@material-ui/icons/ArrowBack";
import ArrowDropDownIcon from "@material-ui/icons/ArrowDropDown";
import ArrowForwardIcon from "@material-ui/icons/ArrowForward";
import ArrowUpwardIcon from "@material-ui/icons/ArrowUpward";
import ClearIcon from "@material-ui/icons/clear";
import CreateIcon from "@material-ui/icons/create";
import MenuIcon from "@material-ui/icons/menu";
import RefreshIcon from "@material-ui/icons/Refresh";
import ShowChartIcon from "@material-ui/icons/ShowChart";
import VisibilityIcon from "@material-ui/icons/Visibility";
import ToggleButton from "@material-ui/lab/ToggleButton";
import ToggleButtonGroup from "@material-ui/lab/ToggleButtonGroup";
import { observer } from "mobx-react";
import * as React from "react";
import { SketchPicker } from "react-color";
import NewChartDialog from "../components/NewChartDialog";
import EditorSetting, {
  ObjectCategory,
  OtherObjectType
} from "../stores/EditorSetting";
import { inject, InjectedComponent } from "../stores/inject";
import { safe } from "../util";
import VerticalDivider from "../components/VerticalDivider";

function getEnumKeys(_enum: any): string[] {
  return Object.values(_enum).filter(
    key => typeof key === "string"
  ) as string[];
}

/**
 * 編集モード
 */
enum EditMode {
  Select = 1,
  Add,
  Delete,
  Connect
}

const styles = (theme: Theme) =>
  createStyles({
    badge: {
      marginTop: ".8rem",
      marginRight: ".5rem",
      boxShadow: `0 0 0 2px ${
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

interface IProps extends WithStyles<typeof styles> {}

@inject
@observer
class Toolbar extends InjectedComponent<IProps> {
  state = {
    // タイムライン上に配置するオブジェクトのサイズ
    timelineDivisionSize: 1,
    // レーン上に配置するオブジェクのサイズ
    laneDivisionSize: 1,

    laneAnchorEl: null,
    noteAnchorEl: null,

    // その他オブジェクトメニューアンカー
    otherAnchorEl: null,

    objectSizeAnchorEl: null,

    displaySettingAnchorEl: null,

    customColorAnchorEl: null,

    anchorEl: null
  };

  handleClick = (event: any) => {
    this.setState({ anchorEl: event.currentTarget });
  };

  handleClose = () => {
    this.setState({ anchorEl: null });
  };

  otherMenuValueTable: any = {
    BPM: ["bpm", "setBpm"],
    Speed: ["speed", "setSpeed"]
  };

  renderOtherMenu() {
    const { setting } = this.injected.editor;

    const otherMenuKey = getEnumKeys(OtherObjectType)[
      setting.editOtherTypeIndex
    ];

    if (!this.otherMenuValueTable[otherMenuKey]) {
      return <span>{otherMenuKey}</span>;
    }

    const defaultValue = (setting as any)[
      this.otherMenuValueTable[otherMenuKey][0]
    ];
    const setter = (setting as any)[this.otherMenuValueTable[otherMenuKey][1]];

    return (
      <span>
        {otherMenuKey}
        <TextField
          required
          defaultValue={defaultValue}
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
          onChange={({ target: { value } }) => {
            console.log(setter, value);
            setter.call(setting, Number(value));
          }}
        />
      </span>
    );
  }

  render() {
    const { editor } = this.injected;
    const { setting } = editor;

    const { anchorEl } = this.state;

    const { classes } = this.props;

    if (!editor.currentChart) return <div />;

    const chart = editor.currentChart!;

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "row"
        }}
      >
        {/* Undo */}
        <IconButton
          disabled={!chart.undoable}
          onClick={() => chart!.timeline.undo()}
        >
          <ArrowBackIcon />
        </IconButton>
        {/* Redo */}
        <IconButton
          disabled={!chart.redoable}
          onClick={() => chart!.timeline.redo()}
        >
          <ArrowForwardIcon />
        </IconButton>
        {/* リロードボタン */}
        <IconButton onClick={() => location.reload()}>
          <RefreshIcon />
        </IconButton>

        <VerticalDivider />

        <Badge
          badgeContent={setting.measureDivision}
          color="primary"
          classes={{ badge: this.props.classes.badge }}
        >
          <IconButton aria-label="Delete" onClick={this.handleClick}>
            <MenuIcon />
          </IconButton>
        </Badge>

        <Badge
          badgeContent={setting.objectSize}
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
          {EditorSetting.MEASURE_DIVISIONS.map((value, index) => (
            <MenuItem
              key={index}
              onClick={(e: any) => {
                setting.setMeasureDivision(value);
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
                  setting.setObjectSize(value);
                  this.setState({ objectSizeAnchorEl: null });
                }}
              >
                {value}
              </MenuItem>
            ))}
        </Menu>
        <div className={classes.toggleContainer}>
          <ToggleButtonGroup
            value={setting.editMode}
            exclusive
            onChange={(_, value: EditMode | null) => {
              if (value === null) return;
              setting.setEditMode(value);
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
            value={setting.editObjectCategory}
            exclusive
            onChange={(_, value: ObjectCategory | null) => {
              if (value === null) return;
              setting.setEditObjectCategory(value);
            }}
          >
            <ToggleButton value={ObjectCategory.Note}>
              {safe(
                () =>
                  editor.currentChart!.musicGameSystem!.noteTypes[
                    setting.editNoteTypeIndex
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
                  editor.currentChart!.musicGameSystem!.laneTemplates[
                    setting.editLaneTypeIndex
                  ].name
              )}
              <ArrowDropDownIcon
                onClick={(e: any) =>
                  this.setState({ laneAnchorEl: e.currentTarget })
                }
              />
            </ToggleButton>
            {/* その他オブジェクトメニュー */}
            <ToggleButton value={ObjectCategory.Other}>
              {this.renderOtherMenu()}
              <ArrowDropDownIcon
                onClick={(e: any) =>
                  this.setState({ otherAnchorEl: e.currentTarget })
                }
              />
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
            if (!editor.currentChart!.musicGameSystem) return;
            return editor.currentChart!.musicGameSystem!.noteTypes.map(
              ({ name }, index) => (
                <MenuItem
                  key={index}
                  onClick={() => {
                    setting.setEditNoteTypeIndex(index);
                    this.setState({ noteAnchorEl: null });
                  }}
                >
                  {index + 1}: {name}
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
            if (!editor.currentChart!.musicGameSystem) return;
            return editor.currentChart!.musicGameSystem!.laneTemplates.map(
              ({ name }, index) => (
                <MenuItem
                  key={index}
                  onClick={() => {
                    setting.setEditLaneTypeIndex(index);
                    this.setState({ laneAnchorEl: null });
                  }}
                >
                  {name}
                </MenuItem>
              )
            );
          })()}
        </Menu>
        {/* その他オブジェクトメニュー */}
        <Menu
          anchorEl={this.state.otherAnchorEl}
          open={Boolean(this.state.otherAnchorEl)}
          onClose={(e: any) => {
            this.setState({ otherAnchorEl: null });
          }}
        >
          {(() => {
            if (!editor.currentChart!.musicGameSystem) return;

            return getEnumKeys(OtherObjectType).map((name, index) => (
              <MenuItem
                key={index}
                onClick={() => {
                  setting.setEditOtherTypeIndex(index);
                  this.setState({ otherAnchorEl: null });
                }}
              >
                {name}
              </MenuItem>
            ));
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
                      setting.setObjectVisibility({
                        [key]: v
                      });
                    }}
                    checked={(setting.objectVisibility as any)[key]}
                  />
                }
                label={label}
              />
            ))}
          </FormGroup>
        </Menu>

        <VerticalDivider />

        <Menu
          style={{ marginTop: "2rem" }}
          anchorEl={this.state.customColorAnchorEl}
          open={Boolean(this.state.customColorAnchorEl)}
          onClose={() =>
            this.setState({
              customColorAnchorEl: null
            })
          }
        >
          <SketchPicker
            color={editor.setting.customPropColor}
            onChange={({ hex }) => {
              editor.setting.setCustomPropColor(hex);
            }}
          />
        </Menu>
        <NewChartDialog />
      </div>
    );
  }
}

export default withStyles(styles)(Toolbar);
