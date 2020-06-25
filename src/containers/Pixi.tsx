import * as _ from "lodash";
import { observer } from "mobx-react";
import * as PIXI from "pixi.js";
import * as React from "react";
import { Fraction } from "../math";
import Vector2 from "../math/Vector2";
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
import { OtherObjectRecord, OtherObjectRenderer } from "../objects/OtherObject";
import { EditMode, ObjectCategory } from "../stores/EditorSetting";
import { inject, InjectedComponent } from "../stores/inject";
import CustomRendererUtility from "../utils/CustomRendererUtility";
import { guid } from "../utils/guid";
import * as key from "../utils/keyboard";
import * as pool from "../utils/pool";

@inject
@observer
export default class Pixi extends InjectedComponent {
  private app?: PIXI.Application;
  private container?: HTMLDivElement;
  private graphics?: PIXI.Graphics;
  private currentFrame = 0;

  private isRangeSelection = false;
  private rangeSelectStartPoint: PIXI.Point | null = null;
  private rangeSelectEndPoint: PIXI.Point | null = null;
  private rangeSelectedObjects: any[] = [];

  componentDidMount() {
    this.app = new PIXI.Application({
      width: window.innerWidth,
      height: window.innerHeight,
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

    this.container!.addEventListener(
      "mousedown",
      () => {
        if (!key.isDown("Control") && !key.isDown("Meta"))
          this.injected.editor.clearInspectorTarget();
        if (this.injected.editor.setting.editMode !== EditMode.Select) return;
        this.isRangeSelection = true;
        this.rangeSelectStartPoint = this.getMousePosition();
        this.rangeSelectEndPoint = this.getMousePosition();
      },
      false
    );

    this.container!.addEventListener(
      "mousemove",
      () => {
        if (!this.isRangeSelection) return;
        this.rangeSelectEndPoint = this.getMousePosition();
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
      this.injected.editor.currentFrame++;
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

  /**
   * マウスの座標を取得する
   */
  private getMousePosition() {
    const mousePosition = _.clone(
      this.app!.renderer.plugins.interaction.mouse.global
    );
    mousePosition.x -= this.graphics!.x;
    return mousePosition;
  }

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
    option?: any,
    maxWidth?: number
  ) {
    if (this.tempTextIndex >= this.temporaryTexts.length) {
      const t = new PIXI.Text("");
      t.anchor.set(0.5, 0.5);
      this.graphics!.addChild(t);
      this.temporaryTexts.push(t);
    }

    const t: PIXI.Text & {
      // 前フレームのスタイル
      previousStyleOptions?: any;
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

  private inspectTarget: any = null;

  private inspect(target: any) {
    this.inspectTarget = target;
  }

  seMap = new Map<string, Howl>();

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
    const musicGameSystem = chart.musicGameSystem;

    const timeCalculator = chart.timeline.timeCalculator;

    const w = this.app!.renderer.width;
    const h = this.app!.renderer.height;

    const buttons = this.app!.renderer.plugins.interaction.mouse.buttons;

    let isClick = this.prev === 1 && buttons === 0;
    let isRight = buttons === 2;

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
    if (!chart.timeline.otherObjects.some(object => object.isBPM())) {
      chart.timeline.addOtherObject(
        OtherObjectRecord.new({
          type: 0,
          guid: guid(),
          measureIndex: 0,
          measurePosition: new Fraction(0, 1),
          value: 120
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

    // 小節の操作
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
          $y,
          measure,
          chart.timeline.measures
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

    graphics.x += (measureWidth + padding) * (cy - 0.5);

    if (graphics.x > 0) graphics.x = 0;

    // カーソルを合わせている小節
    const targetMeasure = chart.timeline.measures.find(measure =>
      measure.containsPoint(mousePosition)
    );
    const measureDivision = this.injected.editor.setting.measureDivision;
    const targetMeasureDivision = !targetMeasure
      ? 1
      : measureDivision * Fraction.to01(targetMeasure.beat);

    if (targetMeasure) {
      // ターゲット小節の枠を描画
      if (!targetMeasure.isSelected) {
        targetMeasure.drawBounds(graphics, theme.hover);
      }

      const s = targetMeasure;

      // ターゲット小節の分割線を描画
      const div = targetMeasureDivision;
      for (var i = 1; i < div; ++i) {
        const y = s.y + (s.height / div) * (div - i);
        graphics
          .lineStyle(2, 0xffffff, (4 * i) % measureDivision === 0 ? 1 : 0.6)
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

    // その他オブジェクト描画
    for (const object of chart.timeline.otherObjects) {
      const measure = chart.timeline.measures[object.measureIndex];
      OtherObjectRenderer.render(
        chart.musicGameSystem.otherObjectTypes,
        object,
        graphics,
        measure
      );
    }

    // レーン中間点描画
    if (setting.objectVisibility.lanePoint) {
      for (const lanePoint of chart.timeline.lanePoints) {
        const measure = chart.timeline.measures[lanePoint.measureIndex];

        LanePointRenderer.render(lanePoint, graphics, measure);
      }
    }

    let targetNotePoint: NotePointInfo | null = null;

    const newNoteType =
      chart.musicGameSystem.noteTypes[setting.editNoteTypeIndex];

    // レーン描画
    for (const lane of chart.timeline.lanes) {
      const laneRenderer = LaneRendererResolver.resolve(lane);

      laneRenderer.render(
        lane,
        graphics,
        chart.timeline.lanePointMap,
        chart.timeline.measures,
        targetMeasure || null,
        newNoteType
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

        const newNoteType =
          chart.musicGameSystem.noteTypes[setting.editNoteTypeIndex];

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

    // 可視レイヤーの GUID
    const visibleLayers = new Set(
      chart.layers.filter(layer => layer.visible).map(layer => layer.guid)
    );

    // ノート更新
    for (const note of chart.timeline.notes) {
      const measure = chart.timeline.measures[note.measureIndex];

      // 小節とレイヤーが表示されているなら描画する
      note.isVisible = measure.isVisible && visibleLayers.has(note.layer);
    }

    // ノートライン描画
    for (const noteLine of chart.timeline.noteLines) {
      NoteLineRendererResolver.resolve(noteLine).render(
        noteLine,
        graphics,
        chart.timeline.notes
      );
    }

    // マウスがノート上にあるか
    let isMouseOnNote = false;

    // ノート描画
    for (const note of chart.timeline.notes) {
      if (!note.isVisible) continue;

      NoteRendererResolver.resolve(note).render(note, graphics);

      // ノート関連の操作
      if (setting.editObjectCategory !== ObjectCategory.Note) continue;

      const bounds = note.getBounds();
      if (!bounds.contains(mousePosition.x, mousePosition.y)) continue;
      isMouseOnNote = true;

      // ノート選択 or 削除
      if (
        setting.editMode === EditMode.Select ||
        setting.editMode === EditMode.Delete
      ) {
        if (!note.isSelected) note.drawBounds(graphics, theme.hover);

        if (isClick) {
          if (setting.editMode === EditMode.Delete) {
            chart.timeline.removeNote(note);
            chart.save();
          }
          if (setting.editMode === EditMode.Select) {
            this.inspect(note);
          }
        }

        if (isRight) {
          this.isRangeSelection = false;
          chart.timeline.removeNote(note);
          chart.save();
        }
      }

      // ノート接続
      if (setting.editMode === EditMode.Connect) {
        graphics
          .lineStyle(2, 0xff9900)
          .drawRect(bounds.x, bounds.y, bounds.width, bounds.height);

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

              this.connectTargetNote = note;
            }
          }
        } else {
          if (isClick) {
            this.connectTargetNote = note;
          }
        }
      }
    }

    // 選択中表示
    for (const object of editor.inspectorTargets) {
      object.drawBounds?.(graphics, theme.selected);
    }

    // 接続モードじゃないかノート外をタップしたら接続対象ノートを解除
    if (setting.editMode !== EditMode.Connect || (isClick && !isMouseOnNote)) {
      this.connectTargetNote = null;
    }

    // その他オブジェクト選択/削除
    if (
      setting.editMode === EditMode.Select ||
      setting.editMode === EditMode.Delete
    ) {
      for (const object of chart.timeline.otherObjects) {
        const bounds = OtherObjectRenderer.getBounds(
          chart.musicGameSystem.otherObjectTypes,
          object,
          chart.timeline.measures[object.measureIndex]
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
            if (setting.editMode === EditMode.Select) {
              this.inspect(object);
            } else if (setting.editMode === EditMode.Delete) {
              // 削除はオブジェクトモードの場合だけ行う
              if (setting.editObjectCategory === ObjectCategory.Other) {
                chart.timeline.removeOtherObject(object);
                chart.save();
              }
            }
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
      const newNoteType =
        chart.musicGameSystem.noteTypes[setting.editNoteTypeIndex];

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
          speed: 1,
          lane: targetNotePoint!.lane.guid,
          layer: chart.currentLayer.guid,
          editorProps: {
            time: 0
          },
          customProps: {
            customColor: setting.customPropColor
          }
        },
        chart
      );

      if (isClick) {
        // 同じレーンの重なっているノートを取得する
        const overlapNotes = chart.timeline.notes.filter(
          note =>
            note.lane === newNote.lane &&
            note.layer === newNote.layer &&
            note.measureIndex === newNote.measureIndex &&
            Fraction.equal(note.measurePosition, newNote.measurePosition) &&
            newNote.horizontalPosition.numerator <=
              note.horizontalPosition.numerator + note.horizontalSize - 1 &&
            note.horizontalPosition.numerator <=
              newNote.horizontalPosition.numerator + newNote.horizontalSize - 1
        );

        // 重なっているノートを削除する
        for (const note of overlapNotes) {
          chart.timeline.removeNote(note);
        }

        chart.timeline.addNote(newNote);
        chart.save();
      } else {
        NoteRendererResolver.resolve(newNote).render(newNote, graphics);
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
          LanePointRenderer.getBounds(
            lanePoint,
            chart.timeline.measures[lanePoint.measureIndex]
          ).contains(mousePosition.x, mousePosition.y)
        ) {
          // console.log("接続！", lanePoint);

          const laneTemplate = chart.musicGameSystem.laneTemplateMap.get(
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
              chart.timeline.measures,
              null,
              newNoteType
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

    // 接続しようとしてるノートの枠を描画
    if (this.connectTargetNote) {
      const bounds = this.connectTargetNote.getBounds();

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
      const laneTemplate = editor.currentChart!.musicGameSystem.laneTemplates[
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

      if (isClick) {
        this.injected.editor.currentChart!.timeline.addLanePoint(newLanePoint);
        chart.save();
      } else {
        // プレビュー
        LanePointRenderer.render(
          newLanePoint,
          graphics,
          chart.timeline.measures[newLanePoint.measureIndex]
        );
      }
    }

    // その他オブジェクト配置
    if (
      targetMeasure &&
      setting.editMode === EditMode.Add &&
      setting.editObjectCategory === ObjectCategory.Other
    ) {
      const [, ny] = normalizeContainsPoint(targetMeasure, mousePosition);

      const vlDiv = targetMeasureDivision;

      const newObject = OtherObjectRecord.new({
        type: setting.editOtherTypeIndex,
        measureIndex: targetMeasure.index,
        measurePosition: new Fraction(
          vlDiv - 1 - _.clamp(Math.floor(ny * vlDiv), 0, vlDiv - 1),
          vlDiv
        ),
        guid: guid(),
        value: setting.otherValue
      });

      if (isClick) {
        chart.timeline.addOtherObject(newObject);
        chart.save();
      } else {
        // プレビュー
        OtherObjectRenderer.render(
          chart.musicGameSystem.otherObjectTypes,
          newObject,
          graphics,
          chart.timeline.measures[newObject.measureIndex]
        );
      }
    }

    // 範囲選択
    if (this.isRangeSelection) {
      graphics
        .lineStyle(2, 0x0099ff)
        .beginFill(0x0099ff, 0.2)
        .drawRect(
          this.rangeSelectStartPoint!.x,
          this.rangeSelectStartPoint!.y,
          this.rangeSelectEndPoint!.x - this.rangeSelectStartPoint!.x,
          this.rangeSelectEndPoint!.y - this.rangeSelectStartPoint!.y
        )
        .endFill();

      // start, end を左上から近い順にソートする
      const x = [
        this.rangeSelectStartPoint!.x,
        this.rangeSelectEndPoint!.x
      ].sort((a, b) => a - b);
      const y = [
        this.rangeSelectStartPoint!.y,
        this.rangeSelectEndPoint!.y
      ].sort((a, b) => a - b);

      const rect = new PIXI.Rectangle(x[0], y[0], x[1] - x[0], y[1] - y[0]);

      // 選択範囲内に配置されているノートを選択する
      for (const note of chart.timeline.notes) {
        if (!note.isVisible) continue;

        const inRange =
          rect.contains(note.x, note.y) &&
          rect.contains(note.x + note.width, note.y + note.height);
        const isSelected = this.rangeSelectedObjects.includes(note);

        // 範囲内のものが未選択なら選択
        if (inRange && !isSelected) {
          this.rangeSelectedObjects.push(note);
          editor.addInspectorTarget(note);
        }
        // 選択済みのものが範囲外になっていたら選択を外す
        if (!inRange && isSelected) {
          this.rangeSelectedObjects = this.rangeSelectedObjects.filter(
            x => x !== note
          );
          editor.removeInspectorTarget(note);
        }
      }
    }

    this.seMap.clear();

    // 再生時間がノートの判定時間を超えたら SE を鳴らす
    for (const note of chart.timeline.notes) {
      // 判定時間
      const judgeTime = note.editorProps.time;

      // 時間が巻き戻っていたら SE 再生済みフラグをリセットする
      if (currentTime < this.previousTime && currentTime < judgeTime) {
        note.sePlayed = false;
      }

      if (!chart.isPlaying || note.sePlayed) continue;

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
        note.sePlayed = true;
      }
    }

    for (const se of this.seMap.values()) {
      se.volume(chart.seVolume);
      se.play();
    }

    this.previousTime = currentTime;

    if (isClick) {
      this.isRangeSelection = false;
      if (this.inspectTarget && this.rangeSelectedObjects.length === 0) {
        editor.addInspectorTarget(this.inspectTarget);
      }
      this.rangeSelectedObjects = [];
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
