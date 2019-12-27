import {
  Badge,
  createStyles,
  FormGroup,
  IconButton,
  Menu,
  MenuItem,
  withStyles,
  WithStyles
} from "@material-ui/core";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import { Theme } from "@material-ui/core/styles/createMuiTheme";
import Switch from "@material-ui/core/Switch";
import {
  Menu as MenuIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon
} from "@material-ui/icons";
import AddIcon from "@material-ui/icons/Add";
import ArrowBackIcon from "@material-ui/icons/ArrowBack";
import ArrowForwardIcon from "@material-ui/icons/ArrowForward";
import { observer } from "mobx-react";
import * as React from "react";
import { SketchPicker } from "react-color";
import EditModeSelect from "../components/EditModeSelect";
import EditTargetSelect from "../components/EditTargetSelect";
import NewChartDialog from "../components/NewChartDialog";
import VerticalDivider from "../components/VerticalDivider";
import EditorSetting from "../stores/EditorSetting";
import { inject, InjectedComponent } from "../stores/inject";

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
      padding: theme.spacing(2)
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

  /**
   * リロード
   */
  handleReload = () => {
    localStorage.setItem(
      "filePaths",
      JSON.stringify(
        this.injected.editor.charts.map(c => c.filePath).filter(p => p)
      )
    );
    location.reload();
  };

  render() {
    const { editor } = this.injected;
    const { setting } = editor;

    const { anchorEl } = this.state;

    const { classes } = this.props;

    if (!editor.currentChart) return <div />;

    const chart = editor.currentChart!;
    const otherTypes = chart.musicGameSystem!.otherObjectTypes;

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "row"
        }}
      >
        {/* Undo */}
        <IconButton
          disabled={!chart.canUndo}
          onClick={() => chart!.timeline.undo()}
        >
          <ArrowBackIcon />
        </IconButton>
        {/* Redo */}
        <IconButton
          disabled={!chart.canRedo}
          onClick={() => chart!.timeline.redo()}
        >
          <ArrowForwardIcon />
        </IconButton>
        {/* リロードボタン */}
        <IconButton onClick={this.handleReload}>
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

        <EditModeSelect
          value={setting.editMode}
          onChange={editMode => setting.setEditMode(editMode)}
        />

        <EditTargetSelect
          value={setting.editObjectCategory}
          onChange={editObjectCategory =>
            setting.setEditObjectCategory(editObjectCategory)
          }
          musicGameSystem={chart.musicGameSystem!}
          editNoteTypeIndex={setting.editNoteTypeIndex}
          editLaneTypeIndex={setting.editLaneTypeIndex}
          editOtherTypeIndex={setting.editOtherTypeIndex}
          otherValue={setting.otherValue}
          onOtherValueChange={otherValue => setting.setOtherValue(otherValue)}
          onNote={noteAnchorEl => this.setState({ noteAnchorEl })}
          onLane={laneAnchorEl => this.setState({ laneAnchorEl })}
          onOther={otherAnchorEl => this.setState({ otherAnchorEl })}
        />

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

            return otherTypes.map(({ name }, index) => (
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
