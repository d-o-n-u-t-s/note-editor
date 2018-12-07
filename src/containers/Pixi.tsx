import * as _ from "lodash";
import { observer } from "mobx-react";
import * as PIXI from "pixi.js";
import * as React from "react";
import { Fraction } from "../math";
import Vector2 from "../math/Vector2";
import { BpmChangeRecord, BPMRenderer } from "../objects/BPMChange";
import { Lane } from "../objects/Lane";
import { LanePoint } from "../objects/LanePoint";
import LanePointRenderer from "../objects/LanePointRenderer";
import { NotePointInfo } from "../objects/LaneRenderer";
import LaneRendererResolver from "../objects/LaneRendererResolver";
import { Measure, sortMeasureData } from "../objects/Measure";
import MeasureRendererResolver from "../objects/MeasureRendererResolver";
import { Note, NoteRecord } from "../objects/Note";
import { NoteLineRecord } from "../objects/NoteLine";
import NoteLineRendererResolver from "../objects/NoteLineRendererResolver";
import NoteRendererResolver from "../objects/NoteRendererResolver";
import { SpeedChange, SpeedRenderer } from "../objects/SpeedChange";
import {
  EditMode,
  ObjectCategory,
  OtherObjectType
} from "../stores/EditorSetting";
import { inject, InjectedComponent } from "../stores/inject";
import { guid } from "../util";
import CustomRendererUtility from "../utils/CustomRendererUtility";
import * as pool from "../utils/pool";
import * as key from "../utils/keyboard";

@inject
@observer
export default class Pixi extends InjectedComponent {
  private app?: PIXI.Application;
  private container?: HTMLDivElement;
  private graphics?: PIXI.Graphics;
  private currentFrame = 0;

  componentDidMount() {
    this.app = new PIXI.Application(window.innerWidth, window.innerHeight, {
      antialias: true
    });

    this.app.view.style.width = "100%";
    this.app.view.style.height = "100%";

    this.container!.appendChild(this.app.view);

    this.container!.addEventListener(
      "mousewheel",
      (e: any) => {
        const chart = this.injected.editor.currentChart!;
        const direction = this.injected.editor.setting.reverseScroll ? -1 : 1;
        chart.setTime(chart.time + e.wheelDelta * 0.01 * direction, true);
      },
      false
    );

    key.beginWatch();

    const app = this.app;

    const graphics = (this.graphics = new PIXI.Graphics());

    app.stage.addChild(graphics);

    app.stage.x = 0;
    app.stage.y = 0;

    app.renderer.plugins.interaction.moveWhenInside = false;

    app.ticker.add(() => {
      const w = app!.view.parentElement!.parentElement!.clientWidth;
      const h = app!.view.parentElement!.parentElement!.clientHeight;

      // リサイズ
      if (app.renderer.width !== w || app.renderer.height !== h) {
        app.renderer.resize(w, h);
        this.update3D();
      }
      this.renderCanvas();

      this.currentFrame++;
    });

    this.app.start();

    this.update3D();
  }

  componentWillUnmount() {
    this.app!.stop();
  }

  private temporaryTexts: PIXI.Text[] = [];

  static debugGraphics?: PIXI.Graphics;

  static instance?: Pixi;

  private tempTextIndex = 0;

  getRenderAreaSize() {
    return new Vector2(this.app!.renderer.width, this.app!.renderer.height);
  }

  /**
   * 描画範囲を取得する
   */
  getRenderArea() {
    return new PIXI.Rectangle(
      -this.graphics!.x,
      0,
      this.app!.renderer.width,
      this.app!.renderer.height
    );
  }

  drawText(
    text: string,
    x: number,
    y: number,
    option?: PIXI.TextStyleOptions,
    maxWidth?: number
  ) {
    if (this.tempTextIndex >= this.temporaryTexts.length) {
      const t = new PIXI.Text();
      t.anchor.set(0.5, 0.5);
      this.graphics!.addChild(t);
      this.temporaryTexts.push(t);
    }

    const t: PIXI.Text & {
      // 前フレームのスタイル
      previousStyleOptions?: PIXI.TextStyleOptions;
      previousMaxWidth?: number;
    } = this.temporaryTexts[this.tempTextIndex];

    // .text か .style に値を代入すると再描画処理が入るので
    // 前フレームと比較して更新を最小限にする
    if (
      t.text !== text ||
      !_.isEqual(t.previousStyleOptions, option) ||
      t.previousMaxWidth !== maxWidth
    ) {
      t.text = text;
      t.style = Object.assign(
        {
          fontFamily: "'Noto Sans JP', sans-serif",
          fontSize: 20,
          fill: 0xffffff,
          dropShadow: true,
          dropShadowBlur: 8,
          dropShadowColor: "#000000",
          dropShadowDistance: 0
        },
        option
      ) as PIXI.TextStyle;

      // 拡大率をリセットして文字の横幅を算出する
      t.scale.x = 1;
      if (maxWidth !== undefined) {
        t.scale.x = Math.min(1, maxWidth / t.width);
      }

      t.previousStyleOptions = option;
      t.previousMaxWidth = maxWidth;
    }
    t.x = x;
    t.y = y;

    t.visible = true;

    this.tempTextIndex++;
  }

  prev: number = 0;

  connectTargetNote: Note | null = null;
  connectTargetLanePoint: LanePoint | null = null;

  /**
   * 前フレームの再生時間
   */
  previousTime = 0.0;

  inspectTarget: any = null;

  private inspect(target: any) {
    this.inspectTarget = target;
  }

  seMap = new Map<string, Howl>();

  private getMeasureDivision(measure?: Measure) {
    if (!measure) return 1;
    return this.injected.editor.setting.measureDivisionMultiplyBeat
      ? Math.round(
          this.injected.editor.setting.measureDivision *
            Fraction.to01(measure.beat)
        )
      : this.injected.editor.setting.measureDivision;
  }

  /**
   * canvas を再描画する
   */
  private renderCanvas() {
    pool.resetAll();
    this.inspectTarget = null;

    if (!this.app) return;
    if (!this.injected.editor.currentChart) return;

    CustomRendererUtility.update(this.currentFrame);

    Pixi.instance = this;
    const graphics = this.graphics!;
    Pixi.debugGraphics = graphics;

    // 一時テキストを削除
    for (const temp of this.temporaryTexts) temp.visible = false;
    this.tempTextIndex = 0;

    const { editor } = this.injected;
    const { setting } = editor;
    const { theme, padding, measureWidth } = setting;

    const chart = editor.currentChart!;
    const musicGameSystem = chart.musicGameSystem!;

    const timeCalculator = chart.timeline.timeCalculator;

    const w = this.app!.renderer.width;
    const h = this.app!.renderer.height;

    const buttons = this.app!.renderer.plugins.interaction.mouse.buttons;

    let isClick = this.prev === 0 && buttons === 1;

    const viewRect = this.app!.view.getBoundingClientRect();

    // 編集画面外ならクリックしていないことにする
    const mousePosition = _.clone(
      this.app!.renderer.plugins.interaction.mouse.global
    );
    if (
      !new PIXI.Rectangle(0, 0, viewRect.width, viewRect.height).contains(
        mousePosition.x,
        mousePosition.y
      )
    ) {
      isClick = false;
    }
    mousePosition.x -= graphics.x;

    this.prev = buttons;

    graphics.clear();

    // BPM が 1 つも存在しなかったら仮 BPM を先頭に配置する
    if (!chart.timeline.bpmChanges.length) {
      chart.timeline.addBpmChange(
        BpmChangeRecord.new({
          guid: guid(),
          measureIndex: 0,
          measurePosition: new Fraction(0, 1),
          bpm: 120
        })
      );
      chart.save();
    }

    chart.updateTime();
    const currentTime = chart.time - chart.startTime;

    // 判定ラインの x 座標
    let cx = 0;

    // 0 ~ 1 に正規化された判定ラインの y 座標
    let cy = 0;

    for (const measure of chart.timeline.measures) {
      // 小節の開始時刻、終了時刻
      measure.beginTime = timeCalculator.getTime(measure.index);
      measure.endTime = timeCalculator.getTime(measure.index + 1);
      measure.containsCurrentTime = false;

      // 小節の中に現在時刻があるなら
      if (measure.beginTime <= currentTime && currentTime < measure.endTime) {
        // 位置を二分探索
        let min = 0,
          max = 1,
          pos = 0.5;
        while ((max - min) * measure.height > 1) {
          if (currentTime < timeCalculator.getTime(measure.index + pos)) {
            max = pos;
          } else {
            min = pos;
          }
          pos = (min + max) / 2;
        }

        measure.containsCurrentTime = true;
        measure.currentTimePosition = pos;
      }
    }

    setting.measureLayout.layout(
      editor.setting,
      this.app!.renderer,
      graphics,
      chart.timeline.measures
    );

    for (const measure of chart.timeline.measures) {
      const x = measure.x;
      const y = measure.y;
      const hh = measure.height;

      // 画面内なら小節を描画する
      if (measure.isVisible) {
        MeasureRendererResolver.resolve().render(
          graphics,
          measure,
          chart.timeline.measures
        );
      }

      // 小節の中に現在時刻があるなら
      if (measure.containsCurrentTime) {
        const $y = y + hh - hh * measure.currentTimePosition;

        cx = x + measureWidth / 2;
        cy = setting.measureLayout.getScrollOffsetY(
          setting,
          measure,
          measure.currentTimePosition
        );

        graphics
          .lineStyle(4, 0xff0000)
          .moveTo(x, $y)
          .lineTo(x + measureWidth, $y);
      }

      if (measure.isVisible) {
        // 小節番号
        this.drawText(
          measure.index.toString().padStart(3, "0"),
          x - padding / 2,
          y + hh - 10,
          { fontSize: 20 },
          padding
        );
        // 拍子
        this.drawText(
          Fraction.to01(measure.beat).toString(),
          x - padding / 2,
          y + hh - 30,
          { fontSize: 20, fill: 0xcccccc },
          padding
        );
      }
    }

    // 対象タイムラインを画面中央に配置する
    graphics.x = w / 2 - cx;

    graphics.x -= (measureWidth + padding) * (cy - 0.5);

    if (graphics.x > 0) graphics.x = 0;

    // カーソルを合わせている小節
    const targetMeasure = chart.timeline.measures.find(measure =>
      measure.containsPoint(mousePosition)
    );
    const targetMeasureDivision = this.getMeasureDivision(targetMeasure);

    const getLane = (note: Note) => chart.timeline.laneMap.get(note.lane)!;
    const getMeasure = (note: Note) =>
      chart.timeline.measures[note.measureIndex];

    const getLanePointRenderer = (lanePoint: LanePoint) => LanePointRenderer;

    if (targetMeasure) {
      // ターゲット小節の枠を描画
      graphics
        .lineStyle(
          theme.targetMeasureBorderWidth,
          theme.targetMeasureBorderColor,
          theme.targetMeasureBorderAlpha
        )
        .drawRect(
          targetMeasure.x,
          targetMeasure.y,
          targetMeasure.width,
          targetMeasure.height
        );

      const s = targetMeasure;

      // ターゲット小節の分割線を描画
      const div = targetMeasureDivision;
      for (var i = 1; i < div; ++i) {
        const y = s.y + (s.height / div) * i;
        graphics
          .lineStyle(2, 0xffffff, (4 * i) % div === 0 ? 1 : 0.6)
          .moveTo(s.x, y)
          .lineTo(s.x + measureWidth, y);
      }

      // 小節選択
      if (setting.editMode === EditMode.Select && isClick) {
        this.inspect(targetMeasure);
      }

      // レーン追加モードなら小節の横分割線を描画
      if (
        setting.editMode === EditMode.Add &&
        setting.editObjectCategory === ObjectCategory.Lane
      ) {
        for (
          let i = 1;
          i <
          this.injected.editor.currentChart!.timeline.horizontalLaneDivision;
          ++i
        ) {
          const x =
            s.x +
            (measureWidth /
              this.injected.editor.currentChart!.timeline
                .horizontalLaneDivision) *
              i;

          graphics
            .lineStyle(2, 0xffffff, 0.8)
            .moveTo(x, s.y)
            .lineTo(x, s.y + s.height);
        }
      }
    }

    // BPM 描画
    for (const bpm of chart.timeline.bpmChanges) {
      const measure = chart.timeline.measures[bpm.measureIndex];

      BPMRenderer.render(bpm, graphics, measure);
    }

    // 速度変更描画
    for (const speedChange of chart.timeline.speedChanges) {
      const measure = chart.timeline.measures[speedChange.measureIndex];
      SpeedRenderer.render(speedChange, graphics, measure);
    }

    // レーン中間点描画
    if (setting.objectVisibility.lanePoint) {
      for (const lanePoint of chart.timeline.lanePoints) {
        const measure = chart.timeline.measures[lanePoint.measureIndex];

        getLanePointRenderer(lanePoint).render(lanePoint, graphics, measure);
      }
    }

    let targetNotePoint: NotePointInfo | null = null;

    // レーン描画
    for (const lane of chart.timeline.lanes) {
      const laneRenderer = LaneRendererResolver.resolve(lane);

      laneRenderer.render(
        lane,
        graphics,
        chart.timeline.lanePointMap,
        chart.timeline.measures,
        targetMeasure
      );

      // ノート配置モードなら選択中のレーンを計算する
      {
        if (
          !(
            setting.editMode === EditMode.Add &&
            setting.editObjectCategory === ObjectCategory.Note
          ) ||
          !targetMeasure ||
          targetNotePoint
        ) {
          continue;
        }

        const newNoteType = chart.musicGameSystem!.noteTypes[
          setting.editNoteTypeIndex
        ];

        // 配置できないレーンならやめる
        if ((newNoteType.excludeLanes || []).includes(lane.templateName)) {
          continue;
        }

        targetNotePoint = laneRenderer.getNotePointInfoFromMousePosition(
          lane,
          targetMeasure!,
          targetMeasureDivision,
          new Vector2(mousePosition.x, mousePosition.y)
        );
      }
    }

    // ノート更新
    for (const note of chart.timeline.notes) {
      const measure = chart.timeline.measures[note.measureIndex];

      // 小節が描画されているなら描画する
      note.isVisible = measure.isVisible;
    }

    // ノートライン描画
    for (const noteLine of chart.timeline.noteLines) {
      NoteLineRendererResolver.resolve(noteLine).render(
        noteLine,
        graphics,
        chart.timeline.notes
      );
    }

    // ノート描画
    for (const note of chart.timeline.notes) {
      if (!note.isVisible) continue;
      NoteRendererResolver.resolve(note).render(
        note,
        graphics,
        chart.timeline.laneMap.get(note.lane)!,
        chart.timeline.measures[note.measureIndex]
      );
    }

    // ノート選択 or 削除
    if (
      (setting.editMode === EditMode.Select ||
        setting.editMode === EditMode.Delete) &&
      setting.editObjectCategory === ObjectCategory.Note
    ) {
      for (const note of chart.timeline.notes) {
        if (!note.isVisible) continue;

        const bounds = NoteRendererResolver.resolve(note)!.getBounds(
          note,
          getLane(note),
          getMeasure(note)
        );

        if (bounds.contains(mousePosition.x, mousePosition.y)) {
          graphics
            .lineStyle(2, 0xff9900)
            .drawRect(
              bounds.x - 2,
              bounds.y - 2,
              bounds.width + 4,
              bounds.height + 4
            );

          if (isClick) {
            if (setting.editMode === EditMode.Delete) {
              chart.timeline.removeNote(note);
              chart.save();
            }
            if (setting.editMode === EditMode.Select) {
              console.log(
                "ノート時刻:" +
                  Math.round((chart.startTime + note.editorProps.time) * 1000)
              );
              this.inspect(note);
            }
          }
          break;
        }
      }
    }

    // BPM 選択
    if (
      setting.editMode === EditMode.Select &&
      setting.editObjectCategory === ObjectCategory.Other &&
      setting.editOtherTypeIndex === (OtherObjectType.BPM as number) - 1
    ) {
      for (const bpmChange of chart.timeline.bpmChanges) {
        const bounds = BPMRenderer.getBounds(
          bpmChange,
          chart.timeline.measures[bpmChange.measureIndex]
        );

        if (bounds.contains(mousePosition.x, mousePosition.y)) {
          graphics
            .lineStyle(2, 0xff9900)
            .drawRect(
              bounds.x - 2,
              bounds.y - 2,
              bounds.width + 4,
              bounds.height + 4
            );
          if (isClick) {
            this.inspect(bpmChange);
          }
        }
      }
    }

    // BPM 削除
    if (
      setting.editMode === EditMode.Delete &&
      setting.editObjectCategory === ObjectCategory.Other &&
      setting.editOtherTypeIndex === (OtherObjectType.BPM as number) - 1
    ) {
      for (const bpmChange of chart.timeline.bpmChanges) {
        const bounds = BPMRenderer.getBounds(
          bpmChange,
          chart.timeline.measures[bpmChange.measureIndex]
        );

        if (bounds.contains(mousePosition.x, mousePosition.y)) {
          graphics
            .lineStyle(2, 0xff9900)
            .drawRect(
              bounds.x - 2,
              bounds.y - 2,
              bounds.width + 4,
              bounds.height + 4
            );

          if (isClick) {
            chart.timeline.removeBpmChange(bpmChange);
            chart.save();
          }
        }
      }
    }

    // 速度変更削除
    if (
      setting.editMode === EditMode.Delete &&
      setting.editObjectCategory === ObjectCategory.Other &&
      setting.editOtherTypeIndex === (OtherObjectType.Speed as number) - 1
    ) {
      for (const bpmChange of chart.timeline.speedChanges) {
        const bounds = SpeedRenderer.getBounds(
          bpmChange,
          chart.timeline.measures[bpmChange.measureIndex]
        );

        if (bounds.contains(mousePosition.x, mousePosition.y)) {
          graphics
            .lineStyle(2, 0xff9900)
            .drawRect(
              bounds.x - 2,
              bounds.y - 2,
              bounds.width + 4,
              bounds.height + 4
            );

          if (isClick) {
            chart.timeline.removeSpeedChange(bpmChange);
            chart.save();
          }
        }
      }
    }

    // レーン選択中ならノートを配置する
    if (
      targetMeasure &&
      targetNotePoint &&
      setting.editMode === EditMode.Add &&
      setting.editObjectCategory === ObjectCategory.Note
    ) {
      const newNoteType = chart.musicGameSystem!.noteTypes[
        setting.editNoteTypeIndex
      ];

      // 新規ノート
      const newNote = NoteRecord.new(
        {
          guid: guid(),
          horizontalSize: editor.setting!.objectSize,
          horizontalPosition: new Fraction(
            targetNotePoint!.horizontalIndex,
            targetNotePoint!.lane.division
          ),
          measureIndex: targetMeasure.index,
          measurePosition: new Fraction(
            targetMeasureDivision - 1 - targetNotePoint!.verticalIndex!,
            targetMeasureDivision
          ),
          type: newNoteType.name,
          lane: targetNotePoint!.lane.guid,
          editorProps: {
            time: 0,
            sePlayed: false,
            color: 0
          },
          customProps: {
            customColor: setting.customPropColor
          }
        },
        chart
      );

      if (isClick) {
        chart.timeline.addNote(newNote);
        chart.save();
      } else {
        NoteRendererResolver.resolve(newNote).render(
          newNote,
          graphics,
          targetNotePoint!.lane,
          chart.timeline.measures[newNote.measureIndex]
        );
      }
    }

    function normalizeContainsPoint(measure: Measure, point: PIXI.Point) {
      return [
        (point.x - measure.x) / measure.width,
        (point.y - measure.y) / measure.height
      ];
    }

    // 接続モード && レーン編集
    if (
      targetMeasure &&
      // isClick &&
      this.injected.editor.setting!.editMode === EditMode.Connect &&
      this.injected.editor.setting!.editObjectCategory === ObjectCategory.Lane
    ) {
      for (const lanePoint of this.injected.editor.currentChart!.timeline
        .lanePoints) {
        if (
          getLanePointRenderer(lanePoint)
            .getBounds(
              lanePoint,
              chart.timeline.measures[lanePoint.measureIndex]
            )
            .contains(mousePosition.x, mousePosition.y)
        ) {
          // console.log("接続！", lanePoint);

          const laneTemplate = chart.musicGameSystem!.laneTemplateMap.get(
            lanePoint.templateName
          )!;

          // レーン接続プレビュー
          if (
            this.connectTargetLanePoint &&
            // 同じレーンポイントではない
            this.connectTargetLanePoint !== lanePoint &&
            this.connectTargetLanePoint.templateName === lanePoint.templateName
          ) {
            const newLane = {
              guid: guid(),
              templateName: laneTemplate.name,
              division: laneTemplate.division,
              points: [this.connectTargetLanePoint.guid, lanePoint.guid]
            } as Lane;

            LaneRendererResolver.resolve(newLane).render(
              newLane,
              graphics,
              chart.timeline.lanePointMap,
              chart.timeline.measures
            );

            if (isClick) {
              chart.timeline.addLane(newLane);
              chart.timeline.optimiseLane();
            }
          }

          if (isClick) {
            this.connectTargetLanePoint = lanePoint;
          }
        }
      }
    }

    // 接続中のノートが削除されたら後始末
    if (
      this.connectTargetNote &&
      !chart.timeline.notes.includes(this.connectTargetNote)
    ) {
      this.connectTargetNote = null;
    }

    // ノート接続
    if (
      setting.editMode === EditMode.Connect &&
      setting.editObjectCategory === ObjectCategory.Note
    ) {
      for (const note of chart.timeline.notes) {
        const bounds = NoteRendererResolver.resolve(note)!.getBounds(
          note,
          getLane(note),
          getMeasure(note)
        );

        if (bounds.contains(mousePosition.x, mousePosition.y)) {
          graphics
            .lineStyle(2, 0xff9900)
            //.beginFill(0x0099ff, 0.3)
            .drawRect(bounds.x, bounds.y, bounds.width, bounds.height);
          //.endFill();

          if (
            this.connectTargetNote &&
            // 同じノートタイプか接続可能なノートタイプなら
            (this.connectTargetNote.type === note.type ||
              musicGameSystem.noteTypeMap
                .get(this.connectTargetNote.type)!
                .connectableTypes.includes(note.type))
          ) {
            const [head, tail] = [this.connectTargetNote, note].sort(
              sortMeasureData
            );

            const newNoteLine = NoteLineRecord.new({
              guid: guid(),
              head: head.guid,
              tail: tail.guid
            });

            // ノートラインプレビュー
            NoteLineRendererResolver.resolve(newNoteLine).render(
              newNoteLine,
              graphics,
              chart.timeline.notes
            );

            if (isClick) {
              // 同じノートを接続しようとしたら接続状態をリセットする
              if (this.connectTargetNote === note) {
                this.connectTargetNote = null;
              } else {
                chart.timeline.addNoteLine(newNoteLine);
                chart.save();

                console.log("接続 2");

                this.connectTargetNote = note;
              }
            }
          } else {
            if (isClick) {
              this.connectTargetNote = note;
              console.log("接続 1");
            }
          }
        }
      }
    }

    // 接続しようとしてるノートの枠を描画
    if (this.connectTargetNote) {
      const bounds = NoteRendererResolver.resolve(
        this.connectTargetNote
      )!.getBounds(
        this.connectTargetNote,
        getLane(this.connectTargetNote),
        getMeasure(this.connectTargetNote)
      );

      graphics
        .lineStyle(2, 0xff9900)
        .drawRect(bounds.x, bounds.y, bounds.width, bounds.height);
    }

    // レーン配置
    if (
      targetMeasure &&
      setting.editMode === EditMode.Add &&
      setting.editObjectCategory === ObjectCategory.Lane
    ) {
      // レーンテンプレ
      const laneTemplate = editor.currentChart!.musicGameSystem!.laneTemplates[
        editor.setting!.editLaneTypeIndex
      ];

      const [nx, ny] = normalizeContainsPoint(targetMeasure, mousePosition);

      const hlDiv = this.injected.editor.currentChart!.timeline
        .horizontalLaneDivision;

      const vlDiv = targetMeasureDivision;

      const maxObjectSize = 16;

      const p = (editor.setting!.objectSize - 1) / maxObjectSize / 2;

      const newLanePoint = {
        measureIndex: targetMeasure.index,
        measurePosition: new Fraction(
          vlDiv - 1 - _.clamp(Math.floor(ny * vlDiv), 0, vlDiv - 1),
          vlDiv
        ),
        guid: guid(),
        color: Number(laneTemplate.color),
        horizontalSize: editor.setting!.objectSize,
        templateName: laneTemplate.name,
        horizontalPosition: new Fraction(
          _.clamp(
            Math.floor((nx - p) * hlDiv),
            0,
            hlDiv - editor.setting!.objectSize
          ),
          hlDiv
        )
      } as LanePoint;

      //lane.renderer.update(graphics, chart.timeline.measures);

      if (isClick) {
        this.injected.editor.currentChart!.timeline.addLanePoint(newLanePoint);
        chart.save();
      } else {
        // プレビュー

        getLanePointRenderer(newLanePoint).render(
          newLanePoint,
          graphics,
          chart.timeline.measures[newLanePoint.measureIndex]
        );
      }
    }

    // BPM 変更配置
    if (
      targetMeasure &&
      setting.editMode === EditMode.Add &&
      setting.editObjectCategory === ObjectCategory.Other &&
      setting.editOtherTypeIndex === (OtherObjectType.BPM as number) - 1
    ) {
      const [, ny] = normalizeContainsPoint(targetMeasure, mousePosition);

      const vlDiv = targetMeasureDivision;

      const newBpmChange = BpmChangeRecord.new({
        measureIndex: targetMeasure.index,
        measurePosition: new Fraction(
          vlDiv - 1 - _.clamp(Math.floor(ny * vlDiv), 0, vlDiv - 1),
          vlDiv
        ),
        guid: guid(),
        bpm: setting.bpm
      });

      if (isClick) {
        chart.timeline.addBpmChange(newBpmChange);
        chart.save();
      } else {
        // プレビュー
        BPMRenderer.render(
          newBpmChange,
          graphics,
          chart.timeline.measures[newBpmChange.measureIndex]
        );
      }
    }

    // 速度変更配置
    if (
      targetMeasure &&
      setting.editMode === EditMode.Add &&
      setting.editObjectCategory === ObjectCategory.Other &&
      setting.editOtherTypeIndex === (OtherObjectType.Speed as number) - 1
    ) {
      const [, ny] = normalizeContainsPoint(targetMeasure, mousePosition);

      const vlDiv = targetMeasureDivision;
      const newLanePoint = {
        measureIndex: targetMeasure.index,
        measurePosition: new Fraction(
          vlDiv - 1 - _.clamp(Math.floor(ny * vlDiv), 0, vlDiv - 1),
          vlDiv
        ),
        guid: guid(),
        speed: setting.speed
      } as SpeedChange;

      if (isClick) {
        this.injected.editor.currentChart!.timeline.addSpeedChange(
          newLanePoint
        );
        chart.save();
      } else {
        // プレビュー
        SpeedRenderer.render(
          newLanePoint,
          graphics,
          chart.timeline.measures[newLanePoint.measureIndex]
        );
      }
    }

    this.seMap.clear();

    // 再生時間がノートの判定時間を超えたら SE を鳴らす
    for (const note of chart.timeline.notes) {
      // 判定時間
      const judgeTime = note.editorProps.time;

      // 時間が巻き戻っていたら SE 再生済みフラグをリセットする
      if (currentTime < this.previousTime && currentTime < judgeTime) {
        note.editorProps.sePlayed = false;
      }

      if (!chart.isPlaying || note.editorProps.sePlayed) continue;

      if (currentTime >= judgeTime) {
        // SE を鳴らす
        if (
          !this.seMap.has(note.type) &&
          musicGameSystem.seMap.has(note.type)
        ) {
          this.seMap.set(
            note.type,
            musicGameSystem.seMap.get(note.type)!.next()
          );
        }
        note.editorProps.sePlayed = true;
      }
    }

    for (const se of this.seMap.values()) se.play();

    this.previousTime = currentTime;

    if (this.inspectTarget) {
      if (key.isDown("Control") || key.isDown("Meta")) {
        editor.addInspectorTarget(this.inspectTarget);
      } else {
        editor.setInspectorTarget(this.inspectTarget);
      }
    }
  }

  update3D() {
    const setting = this.injected.editor.setting;

    if (!this.app) return;

    if (setting.preserve3D) {
      this.app.view.style.transform = `
        rotateX(${setting.rotateX}deg)
        scale(${setting.scale3D})
      `;
      this.app.view.style.transformOrigin = "50% 100% 0px";
      this.app.view.style.boxShadow = `
        +${this.app.view.width}px 0px #000,
        -${this.app.view.width}px 0px #000
      `;
    } else {
      this.app.view.style.transform = "";
      this.app.view.style.transformOrigin = "";
      this.app.view.style.boxShadow = "";
    }
  }

  render() {
    let component = this;
    const setting = this.injected.editor.setting;

    this.update3D();

    return (
      <div
        style={
          setting.preserve3D
            ? {
                transformStyle: "preserve-3d",
                perspective: setting.perspective + "px"
              }
            : {}
        }
        ref={thisDiv => {
          component.container = thisDiv!;
        }}
      />
    );
  }
}
