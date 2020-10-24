import {
  Badge,
  createStyles,
  FormGroup,
  IconButton,
  makeStyles,
  Menu,
  MenuItem,
} from "@material-ui/core";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import { Theme } from "@material-ui/core/styles/createMuiTheme";
import Switch from "@material-ui/core/Switch";
import {
  Menu as MenuIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
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
import ThemeButton from "../components/ThemeButton";
import VerticalDivider from "../components/VerticalDivider";
import EditorSetting from "../stores/EditorSetting";
import { emptyChart, IEmptyChart } from "../stores/EmptyChart";
import { useStores } from "../stores/stores";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    badge: {
      marginTop: ".8rem",
      marginRight: ".5rem",
      boxShadow: `0 0 0 2px ${
        theme.palette.type === "light"
          ? theme.palette.grey[200]
          : theme.palette.grey[900]
      }`,
    },
    displaySetting: {
      outline: 0,
      padding: theme.spacing(2),
    },
  })
);

export default observer(function Toolbar() {
  const { editor } = useStores();
  const classes = useStyles();

  const [state, setState] = React.useState<{
    timelineDivisionSize: number;
    laneDivisionSize: number;
    laneAnchorEl: Element | null;
    noteAnchorEl: Element | null;
    otherAnchorEl: Element | null;
    objectSizeAnchorEl: Element | null;
    displaySettingAnchorEl: Element | null;
    customColorAnchorEl: Element | null;
    anchorEl: Element | null;
  }>({
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

    anchorEl: null,
  });

  function handleClick(event: any) {
    setState({
      ...state,
      anchorEl: event.currentTarget as HTMLElement,
    });
  }

  function handleClose() {
    setState({ ...state, anchorEl: null });
  }

  const { setting } = editor;

  const { anchorEl } = state;

  const chart: IEmptyChart = editor.currentChart ?? emptyChart;

  const otherTypes = chart.musicGameSystem.otherObjectTypes;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
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

      <VerticalDivider />

      <Badge
        badgeContent={setting.measureDivision}
        color="primary"
        classes={{ badge: classes.badge }}
      >
        <IconButton aria-label="Delete" onClick={handleClick}>
          <MenuIcon />
        </IconButton>
      </Badge>

      <Badge
        badgeContent={setting.objectSize}
        color="primary"
        classes={{ badge: classes.badge }}
      >
        <IconButton
          aria-label="Delete"
          onClick={(e) =>
            setState({ ...state, objectSizeAnchorEl: e.currentTarget })
          }
        >
          <MenuIcon />
        </IconButton>
      </Badge>
      <Menu
        id="simple-menu"
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        {EditorSetting.MEASURE_DIVISIONS.map((value, index) => (
          <MenuItem
            key={index}
            onClick={(e: any) => {
              setting.setMeasureDivision(value);
              handleClose();
            }}
          >
            {value}
          </MenuItem>
        ))}
      </Menu>
      {/* 配置オブジェクトサイズ */}
      <Menu
        anchorEl={state.objectSizeAnchorEl}
        open={Boolean(state.objectSizeAnchorEl)}
        onClose={() => setState({ ...state, objectSizeAnchorEl: null })}
      >
        {Array.from({ length: 16 })
          .fill(0)
          .map((_, index) => index + 1)
          .map((value, index) => (
            <MenuItem
              key={index}
              onClick={(e: any) => {
                setting.setObjectSize(value);
                setState({ ...state, objectSizeAnchorEl: null });
              }}
            >
              {value}
            </MenuItem>
          ))}
      </Menu>

      <EditModeSelect
        value={setting.editMode}
        onChange={(editMode) => setting.setEditMode(editMode)}
      />

      <EditTargetSelect
        value={setting.editObjectCategory}
        onChange={(editObjectCategory) =>
          setting.setEditObjectCategory(editObjectCategory)
        }
        musicGameSystem={chart.musicGameSystem}
        editNoteTypeIndex={setting.editNoteTypeIndex}
        editLaneTypeIndex={setting.editLaneTypeIndex}
        editOtherTypeIndex={setting.editOtherTypeIndex}
        otherValue={setting.otherValue}
        onOtherValueChange={(otherValue) => setting.setOtherValue(otherValue)}
        onNote={(noteAnchorEl) => setState({ ...state, noteAnchorEl })}
        onLane={(laneAnchorEl) => setState({ ...state, laneAnchorEl })}
        onOther={(otherAnchorEl) => setState({ ...state, otherAnchorEl })}
      />

      {/* 配置ノートタイプ */}
      <Menu
        anchorEl={state.noteAnchorEl}
        open={Boolean(state.noteAnchorEl)}
        onClose={(e: any) => {
          setState({ ...state, noteAnchorEl: null });
        }}
      >
        {(() => {
          if (!chart.musicGameSystem) return;
          return chart.musicGameSystem.noteTypes.map(({ name }, index) => (
            <MenuItem
              key={index}
              onClick={() => {
                setting.setEditNoteTypeIndex(index);
                setState({ ...state, noteAnchorEl: null });
              }}
            >
              {index + 1}: {name}
            </MenuItem>
          ));
        })()}
      </Menu>
      {/* 配置レーンタイプ */}
      <Menu
        anchorEl={state.laneAnchorEl}
        open={Boolean(state.laneAnchorEl)}
        onClose={(e: any) => {
          setState({ ...state, laneAnchorEl: null });
        }}
      >
        {(() => {
          if (!chart.musicGameSystem) return;
          return chart.musicGameSystem.laneTemplates.map(({ name }, index) => (
            <MenuItem
              key={index}
              onClick={() => {
                setting.setEditLaneTypeIndex(index);
                setState({ ...state, laneAnchorEl: null });
              }}
            >
              {name}
            </MenuItem>
          ));
        })()}
      </Menu>
      {/* その他オブジェクトメニュー */}
      <Menu
        anchorEl={state.otherAnchorEl}
        open={Boolean(state.otherAnchorEl)}
        onClose={(e: any) => {
          setState({ ...state, otherAnchorEl: null });
        }}
      >
        {(() => {
          if (!chart.musicGameSystem) return;

          return otherTypes.map(({ name }, index) => (
            <MenuItem
              key={index}
              onClick={() => {
                setting.setEditOtherTypeIndex(index);
                setState({ ...state, otherAnchorEl: null });
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

      <VerticalDivider />

      {/* 表示設定 */}
      <IconButton
        onClick={(event) => {
          setState({ ...state, displaySettingAnchorEl: event.currentTarget });
        }}
      >
        <VisibilityIcon />
      </IconButton>
      <Menu
        anchorEl={state.displaySettingAnchorEl}
        open={Boolean(state.displaySettingAnchorEl)}
        onClose={() => setState({ ...state, displaySettingAnchorEl: null })}
      >
        <FormGroup className={classes.displaySetting}>
          {[
            ["レーン中間ポイント", "lanePoint"],
            ["レーン", "b"],
            ["ノート", "b"],
          ].map(([label, key], index) => (
            <FormControlLabel
              key={index}
              control={
                <Switch
                  onChange={(_, v) => {
                    setting.setObjectVisibility({
                      [key]: v,
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

      <ThemeButton />

      <Menu
        style={{ marginTop: "2rem" }}
        anchorEl={state.customColorAnchorEl}
        open={Boolean(state.customColorAnchorEl)}
        onClose={() => setState({ ...state, customColorAnchorEl: null })}
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
});
