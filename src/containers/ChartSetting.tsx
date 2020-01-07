import {
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField
} from "@material-ui/core";
import { observer } from "mobx-react";
import * as React from "react";
import AudioSelect from "../components/AudioSelect";
import MusicGameSystemSelect from "../components/MusicGameSystemSelect";
import { useStores } from "../stores/stores";
import { useStyles } from "../styles/styles";

/**
 * 譜面設定コンポーネント
 */
export default observer(function ChartSetting() {
  const { editor } = useStores();
  const classes = useStyles();

  function handleAudioChange(newValue: string) {
    // 音源リセット
    if (newValue === null) {
      editor.currentChart!.resetAudio();
      return;
    }

    const buffer = editor.asset.loadAudioAsset(newValue);
    if (buffer) editor.currentChart!.setAudio(buffer, newValue);
  }

  function handleMusicGameSystemsChange(newValue: number | null) {
    console.log("handleMusicGameSystemsChange", newValue);
  }

  function renderTextField(
    label: string,
    value: string,
    onChange: any,
    type = "text"
  ) {
    return (
      <TextField
        type={type}
        label={label}
        fullWidth
        style={{ margin: "6px 0" }}
        value={value}
        onChange={(e: any) => onChange(e.target.value)}
        InputLabelProps={{
          className: classes.label
        }}
        InputProps={{
          classes: {
            input: classes.input
          }
        }}
      />
    );
  }

  const chart = editor.currentChart;

  // 譜面が存在しない
  if (!chart) return <div />;

  return (
    <div style={{ width: "100%" }}>
      {renderTextField("タイトル", chart.name, (value: any) =>
        chart.setName(value)
      )}
      <AudioSelect
        value={chart.audioSource || ""}
        onChange={handleAudioChange}
        audioAssetPath={editor.asset.audioAssetPath}
      />
      {renderTextField(
        "開始時間",
        chart.startTime.toString(),
        (value: any) => chart.setStartTime(parseFloat(value)),
        "number"
      )}
      <FormControl style={{ width: "100%", margin: "6px 0" }}>
        <InputLabel htmlFor="difficulty" className={classes.label}>
          難易度
        </InputLabel>
        <Select
          value={chart.difficulty}
          onChange={({ target: { value } }) => {
            chart.setDifficulty(parseInt(value as string));
          }}
          inputProps={{
            className: classes.input,
            id: "difficulty"
          }}
        >
          {chart.musicGameSystem.difficulties.map((difficulty, index) => (
            <MenuItem value={index} key={difficulty}>
              {difficulty}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <MusicGameSystemSelect
        value={editor.asset.musicGameSystems.findIndex(
          path => path === chart.musicGameSystem
        )}
        onChange={handleMusicGameSystemsChange}
      />
      <div
        style={{
          maxHeight: 200,
          whiteSpace: "pre",
          overflow: "scroll",
          background: "#eee"
        }}
      />
      <Button
        variant="outlined"
        onClick={() => editor.setInspectorTarget(chart.customProps)}
      >
        カスタム設定
      </Button>
    </div>
  );
});
