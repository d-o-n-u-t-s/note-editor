import * as React from "react";
import * as PIXI from "pixi.js";
import { Fraction } from "../math";
import { EditMode, ObjectCategory } from "../stores/EditorSetting";
import LanePoint from "../objects/LanePoint";
import LanePointRenderer from "../objects/LanePointRenderer";
import { observer } from "mobx-react";
import Lane from "../objects/Lane";
import Note, { INoteData } from "../objects/Note";
import { NoteType } from "../stores/MusicGameSystem";
import Measure, { sortMeasureData } from "../objects/Measure";
import { guid } from "../util";
import Vector2 from "../math/Vector2";
import NoteLine from "../objects/NoteLine";
import LaneRendererResolver from "../objects/LaneRendererResolver";
import NoteRendererResolver from "../objects/NoteRendererResolver";
import NoteLineRendererResolver from "../objects/NoteLineRendererResolver";
import CustomRendererUtility from "../utils/CustomRendererUtility";
import { sortMeasure } from "../objects/Measure";
import { OtherObjectType } from "../stores/EditorSetting";

import { inject, InjectedComponent } from "../stores/inject";
import IBPMChange, { BPMRenderer, TimeCalculator } from "../objects/BPMChange";
import SpeedChange, { SpeedRenderer } from "../objects/SpeedChange";
import { NotePointInfo } from "../objects/LaneRenderer";
import { runInAction, transaction } from "mobx";
import * as _ from "lodash";
import MeasureRendererResolver from "../objects/MeasureRendererResolver";
import * as pool from "../utils/pool";

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
        this.injected.editor.currentChart!.setTime(
          this.injected.editor.currentChart!.time + e.wheelDelta * 0.01,
          true
        );
      },
      false
    );

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
        //this.renderCanvas();
      }
      this.renderCanvas();

      this.currentFrame++;
    });

    this.app.start();
  }

  componentWillUnmount() {
    this.app!.stop();
  }

  texts: PIXI.Text[] = [];

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

  drawTempText(
    text: string,
    x: number,
    y: number,
    option?: PIXI.TextStyleOptions
  ) {
    if (!(this.tempTextIndex < this.temporaryTexts.length)) {
      const t = new PIXI.Text(
        "",
        Object.assign(
          {
            fontSize: 20,
            fill: 0xffffff,
            dropShadow: true,
            dropShadowBlur: 8,
            dropShadowColor: "#000000",
            dropShadowDistance: 0
          },
          option
        )
      );

      t.anchor.x = 0.5;
      t.anchor.y = 0.5;

      this.graphics!.addChild(t);
      this.temporaryTexts.push(t);
    }

    const t = this.temporaryTexts[this.tempTextIndex];
    t.x = x;
    t.y = y;

    t.visible = true;

    t.text = text;

    ++this.tempTextIndex;
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

  /**
   * canvas を再描画する
   */
  private renderCanvas() {
    pool.resetAll();
    this.inspectTarget = null;

    if (!this.app) return;
    if (!this.injected.editor.currentChart) return;

    // console.log("renderCanvas");

    CustomRendererUtility.update(this.currentFrame);

    Pixi.instance = this;
    const graphics = this.graphics!;
    Pixi.debugGraphics = graphics;

    // 一時テキストを削除
    for (const temp of this.temporaryTexts) temp.visible = false;
    this.tempTextIndex = 0;
    // this.temporaryTexts = [];

    const { editor } = this.injected;
    const { setting } = editor;
    const { theme } = setting;

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
      chart.timeline.addBPMChange({
        guid: guid(),
        measureIndex: 0,
        measurePosition: new Fraction(0, 1),
        bpm: 120
      });
    }

    // 縦に何個小節を配置するか
    var hC = this.injected.editor.setting!.verticalLaneCount;

    const padding = this.injected.editor.setting!.padding;

    this.injected.editor.currentChart!.updateTime();
    const currentTime = Math.max(
      this.injected.editor.currentChart!.time - chart.startTime,
      0
    );

    (window as any).g = graphics;

    const laneWidth = this.injected.editor.setting!.laneWidth;

    let index = 0;

    // 判定ラインの x 座標
    let cx = 0;
    // 0 ~ 1 に正規化された判定ラインの y 座標
    let cy = 0;

    // レーンを描画
    draw_lane: for (var $x = 0; ; ++$x) {
      for (var i = hC - 1; i >= 0; --i) {
        var hh = (h - padding * 2) / hC;

        const x = padding + $x * (laneWidth + padding);
        const y = padding + hh * i;

        const measure = chart.timeline.measures[index];

        // 画面内に表示されているか
        measure.isVisible = x + laneWidth > -graphics.x && x < -graphics.x + w;

        measure.x = x;
        measure.y = y;
        measure.width = laneWidth;
        measure.height = hh;

        // 画面内なら小節を描画する
        if (measure.isVisible) {
          MeasureRendererResolver.resolve().render(
            graphics,
            measure,
            chart.timeline.measures
          );
        }

        // 小節の開始時刻、終了時刻
        var b = timeCalculator.getTime(index);
        var e = timeCalculator.getTime(index + 1);

        // 小節の中に現在時刻があるなら
        if (b <= currentTime && currentTime < e) {
          // 位置を二分探索
          let min = 0,
            max = 1,
            pos = 0.5;
          while ((max - min) * hh > 1) {
            if (currentTime < timeCalculator.getTime(index + pos)) {
              max = pos;
            } else {
              min = pos;
            }
            pos = (min + max) / 2;
          }

          const $y = y + hh - hh * pos;

          cx = x + laneWidth / 2;
          // 0 ~ 1
          cy = (hC - 1 - i + pos) / hC;

          graphics
            .lineStyle(4, 0xff0000)
            .moveTo(x, $y)
            .lineTo(x + laneWidth, $y);
        }

        if (!this.texts[index]) {
          let text = new PIXI.Text(
            index + "/" + Fraction.to01(measure.data.beat),
            {
              fontFamily: "'Noto Sans JP', sans-serif",
              fontSize: 20,
              fill: 0xffffff,
              align: "center",
              // textBaseline: "middle",
              dropShadow: true,
              dropShadowBlur: 8,
              dropShadowColor: "#000000",
              dropShadowDistance: 0
            }
          );
          graphics.addChild(text);

          this.texts[index] = text;
        }

        const text = this.texts[index];

        text.x = x - 15;
        text.y = y;

        text.visible = measure.isVisible;

        if (++index >= chart.timeline.measures.length) break draw_lane;
      }
    }

    // 対象タイムラインを画面中央に配置する
    graphics.x = w / 2 - cx;

    graphics.x -= (laneWidth + padding) * (cy - 0.5);

    if (graphics.x > 0) graphics.x = 0;

    // カーソルを合わせている小節
    const targetMeasure = chart.timeline.measures.find(measure =>
      measure.containsPoint(mousePosition)
    );

    // カーソルを合わせている番号
    const targetMeasureIndex = chart.timeline.measures.findIndex(measure =>
      measure.containsPoint(mousePosition)
    );

    const getLane = (note: Note) => chart.timeline.laneMap.get(note.data.lane)!;
    const getMeasure = (note: Note) =>
      chart.timeline.measures[note.data.measureIndex];

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
      const div = this.injected.editor.setting!.measureDivision;
      for (var i = 1; i < div; ++i) {
        const y = s.y + (s.height / div) * i;
        graphics
          .lineStyle(2, 0xffffff, (4 * i) % div === 0 ? 1 : 0.6)
          .moveTo(s.x, y)
          .lineTo(s.x + laneWidth, y);
      }

      if (setting.editMode === EditMode.Select && isClick) {
        this.inspect(chart.timeline.measures[targetMeasureIndex]);
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
            (laneWidth /
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
          setting.measureDivision,
          new Vector2(mousePosition.x, mousePosition.y)
        );
      }
    }

    runInAction("updateNoteVisible", () => {
      // ノート更新
      for (const note of chart.timeline.notes) {
        const measure = chart.timeline.measures[note.data.measureIndex];

        // 小節が描画されているなら描画する
        note.isVisible = measure.isVisible;
      }
    });

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
        chart.timeline.laneMap.get(note.data.lane)!,
        chart.timeline.measures[note.data.measureIndex]
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
            }
            if (setting.editMode === EditMode.Select) {
              console.log("ノートを選択しました", note);
              this.inspect(note.data);
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
      const newNote = new Note(
        {
          guid: guid(),
          horizontalSize: editor.setting!.objectSize,
          horizontalPosition: new Fraction(
            targetNotePoint!.horizontalIndex,
            targetNotePoint!.lane.division
          ),
          measureIndex: chart.timeline.measures.findIndex(
            _ => _ === targetMeasure
          )!,
          measurePosition: new Fraction(
            setting.measureDivision - 1 - targetNotePoint!.verticalIndex!,
            setting.measureDivision
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
      } else {
        NoteRendererResolver.resolve(newNote).render(
          newNote,
          graphics,
          targetNotePoint!.lane,
          chart.timeline.measures[newNote.data.measureIndex]
        );
      }
    }

    const tempPoint = new PIXI.Point();
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
    if (!chart.timeline.notes.find(note => note === this.connectTargetNote)) {
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
            (this.connectTargetNote.data.type === note.data.type ||
              musicGameSystem.noteTypeMap
                .get(this.connectTargetNote.data.type)!
                .connectableTypes.includes(note.data.type))
          ) {
            const [head, tail] = [this.connectTargetNote, note].sort(
              sortMeasureData
            );

            const newNoteLine: NoteLine = {
              head: head.data.guid,
              tail: tail.data.guid
            };

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

      const vlDiv = this.injected.editor.setting!.measureDivision;

      const clamp = (num: number, min: number, max: number) =>
        num <= min ? min : num >= max ? max : num;

      const maxObjectSize = 16;

      const p = (editor.setting!.objectSize - 1) / maxObjectSize / 2;

      const newLanePoint = {
        measureIndex: targetMeasure.data.index,
        measurePosition: new Fraction(
          vlDiv - 1 - clamp(Math.floor(ny * vlDiv), 0, vlDiv - 1),
          vlDiv
        ),
        guid: guid(),
        color: Number(laneTemplate.color),
        horizontalSize: editor.setting!.objectSize,
        templateName: laneTemplate.name,
        horizontalPosition: new Fraction(
          clamp(
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

      const vlDiv = this.injected.editor.setting!.measureDivision;

      const clamp = (num: number, min: number, max: number) =>
        num <= min ? min : num >= max ? max : num;

      const newLanePoint = {
        measureIndex: targetMeasure.data.index,
        measurePosition: new Fraction(
          vlDiv - 1 - clamp(Math.floor(ny * vlDiv), 0, vlDiv - 1),
          vlDiv
        ),
        guid: guid(),
        bpm: setting.bpm
      } as IBPMChange;

      if (isClick) {
        this.injected.editor.currentChart!.timeline.addBPMChange(newLanePoint);
      } else {
        // プレビュー
        BPMRenderer.render(
          newLanePoint,
          graphics,
          chart.timeline.measures[newLanePoint.measureIndex]
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

      const vlDiv = this.injected.editor.setting!.measureDivision;
      const newLanePoint = {
        measureIndex: targetMeasure.data.index,
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
      } else {
        // プレビュー
        SpeedRenderer.render(
          newLanePoint,
          graphics,
          chart.timeline.measures[newLanePoint.measureIndex]
        );
      }
    }

    runInAction("updateSE", () => {
      const seSet = new Set<Howl>();

      // 再生時間がノートの判定時間を超えたら SE を鳴らす
      for (const note of chart.timeline.notes) {
        // 判定時間
        const judgeTime = note.data.editorProps.time;

        // 時間が巻き戻っていたら SE 再生済みフラグをリセットする
        if (currentTime < this.previousTime && currentTime < judgeTime) {
          note.data.editorProps.sePlayed = false;
        }

        if (!chart.isPlaying || note.data.editorProps.sePlayed) continue;

        if (currentTime >= judgeTime) {
          // SE を鳴らす
          if (musicGameSystem.seMap.has(note.data.type)) {
            seSet.add(musicGameSystem.seMap.get(note.data.type)!.next());
          }
          note.data.editorProps.sePlayed = true;
        }
      }

      for (const se of seSet) {
        se.play();
      }
    });

    this.previousTime = currentTime;

    if (this.inspectTarget) {
      editor.setInspectorTarget(this.inspectTarget);
    }
  }

  render() {
    let component = this;
    return (
      <div
        ref={thisDiv => {
          component.container = thisDiv!;
        }}
      />
    );
  }
}
