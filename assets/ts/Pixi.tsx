import * as React from "react";
import * as PIXI from "pixi.js";
import { Fraction } from "./math";
import { EditMode, ObjectCategory } from "./stores/EditorSetting";
import LanePoint from "./objects/LanePoint";
import LanePointRenderer from "./objects/LanePointRenderer";
import { observer } from "mobx-react";
import Lane from "./objects/Lane";
import INote from "./objects/Note";
import { NoteType } from "./stores/MusicGameSystem";
import Measure from "./objects/Measure";
import { guid } from "./util";
import Vector2 from "./math/Vector2";
import NoteLine from "./objects/NoteLine";
import LaneRendererResolver from "./objects/LaneRendererResolver";
import NoteRendererResolver from "./objects/NoteRendererResolver";
import NoteLineRendererResolver from "./objects/NoteLineRendererResolver";
import CustomRendererUtility from "./utils/CustomRendererUtility";
import { sortMeasure } from "./objects/Measure";
import { OtherObjectType } from "./stores/EditorSetting";

import { inject, InjectedComponent } from "./stores/inject";
import BPMChange, { BPMRenderer } from "./objects/BPMChange";
import SpeedChange, { SpeedRenderer } from "./objects/SpeedChange";
import { NotePointInfo } from "./objects/LaneRenderer";
import { runInAction } from "mobx";

@inject
@observer
export default class Pixi extends InjectedComponent {
  private app?: PIXI.Application;
  private container?: HTMLDivElement;

  private renderedAudioBuffer?: AudioBuffer;

  private graphics?: PIXI.Graphics;

  componentDidMount() {
    this.app = new PIXI.Application(window.innerWidth, window.innerHeight, {
      antialias: true
    });

    this.app.view.style.width = "100%";
    this.app.view.style.height = "100%";

    this.container!.appendChild(this.app.view);

    this.container!.addEventListener(
      "mousewheel",
      e => {
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

    function onClick() {}

    app.ticker.add(() => {
      const w = app!.view.parentElement!.parentElement!.clientWidth;
      const h = app!.view.parentElement!.parentElement!.clientHeight;

      // リサイズ
      if (app.renderer.width !== w || app.renderer.height !== h) {
        app.renderer.resize(w, h);
        //this.renderCanvas();
      }
      this.renderCanvas();
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

  measures: Measure[] = [];

  prev: number = 0;

  connectTargetNote: INote | null = null;
  connectTargetLanePoint: LanePoint | null = null;

  /**
   * 前フレームの再生時間
   */
  previousTime = 0.0;

  /**
   * canvas を再描画する
   */
  private renderCanvas() {
    if (!this.app) return;
    if (!this.injected.editor.currentChart) return;

    // console.log("renderCanvas");

    CustomRendererUtility.update();

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

    const w = this.app!.renderer.width;
    const h = this.app!.renderer.height;

    const buttons = this.app!.renderer.plugins.interaction.mouse.buttons;

    const isClick = this.prev === 0 && buttons === 1;
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

    // 小節位置でソートした BPM 変更オブジェクト
    var sortedBpmChanges = chart.timeline.bpmChanges.slice().sort(sortMeasure);

    sortedBpmChanges.push({
      guid: guid(),
      measureIndex: 999,
      measurePosition: new Fraction(0, 1),
      bpm: sortedBpmChanges[sortedBpmChanges.length - 1].bpm
    });

    class BPMRange {
      // 開始時刻
      BeginTime: number = 0;

      // 開始小節
      BeginPosition: number = 0;

      // 終了小節
      public EndPosition = 0;

      // 区間の秒数
      public Duration = 0;

      public Between(value: number): boolean {
        return value >= this.BeginPosition && value < this.EndPosition;
      }

      /// <summary>
      /// 判定時間を取得する
      /// </summary>
      /// <param name="measurePosition">小節位置</param>
      /// <returns>判定時間</returns>
      public GetJudgeTime(measurePosition: number) {
        return (
          this.BeginTime +
          ((measurePosition - this.BeginPosition) /
            (this.EndPosition - this.BeginPosition)) *
            this.Duration
        );
      }
    }

    const measureTimeInfo = new Map<number, BPMRange>();
    var bpmChanges: BPMRange[] = [];
    // BPM の区間を計算する
    var beginTime = 0;
    for (let i = 0; i < sortedBpmChanges.length - 1; i++) {
      var begin = sortedBpmChanges[i];
      var end = sortedBpmChanges[i + 1];

      // 1 小節の時間
      var unitTime2 = (60 / begin.bpm) * 4;

      var beginMeasureIndex =
        Math.floor(begin.measureIndex + begin.measurePosition.to01Number()) | 0;
      var endMeasureIndex =
        Math.floor(end.measureIndex + end.measurePosition.to01Number()) | 0;

      for (
        var measureIndex = beginMeasureIndex;
        measureIndex < endMeasureIndex;
        measureIndex++
      ) {
        // TODO: 小節に拍情報を追加する
        var tempo = 1.0;

        // 区間の秒数
        var time = unitTime2 * tempo;

        var bpmRange = new BPMRange();
        bpmRange.BeginPosition = measureIndex;
        bpmRange.EndPosition = measureIndex + 1;
        bpmRange.BeginTime = beginTime;
        bpmRange.Duration = time;
        bpmChanges.push(bpmRange);

        measureTimeInfo.set(bpmRange.BeginPosition, bpmRange);

        beginTime += time;
      }
    }

    var mousePosition = this.app!.renderer.plugins.interaction.mouse.global;

    // this.app!.renderer.plugins.interaction.mouse.

    // 背景
    // graphics.beginFill(0x171717);
    // graphics.drawRect(0, 0, w, h);

    // 縦に何個小節を配置するか
    var hC = this.injected.editor.setting!.verticalLaneCount;

    var wC = 300;

    const padding = this.injected.editor.setting!.padding;

    const currentTime = Math.max(
      this.injected.editor.currentChart!.time - chart.startTime,
      0
    );

    //console.log(currentTime);

    // while (graphics.children[0]) graphics.removeChild(graphics.children[0]);

    (window as any).g = graphics;

    const laneWidth = this.injected.editor.setting!.laneWidth;

    let index = 0;

    const channel = this.renderedAudioBuffer
      ? this.renderedAudioBuffer.getChannelData(0)
      : null;

    // 判定ラインの x 座標
    let cx = 0;
    // 0 ~ 1 に正規化された判定ラインの y 座標
    let cy = 0;

    // for (const s of this.sprites) s.off("mousemove");

    // レーンを描画
    for (var $x = 0; $x < wC; ++$x) {
      for (var i = hC - 1; i >= 0; --i) {
        var hh = (h - padding * 2) / hC;

        const x = padding + $x * (laneWidth + padding);
        const y = padding + hh * i;

        // 画面内なら小節を描画する
        if (x + laneWidth > -graphics.x && x < -graphics.x + w) {
          graphics
            .lineStyle(2, 0xffffff)
            .beginFill(0x333333)
            .drawRect(x, y, laneWidth, hh)
            .endFill();
        }

        // 小節の開始時刻、終了時刻
        var b = measureTimeInfo.get(index + 0)!.BeginTime; // 0;// unitTime * index;
        var e = measureTimeInfo.get(index + 1)!.BeginTime; //0;//unitTime * (index + 1);

        if (this.renderedAudioBuffer && 0.4 > 1) {
          // TODO: ステレオ判定
          // if (ab.numberOfChannels > 1)

          (window as any).ch = channel;

          // 小節の開始、終了サンプルインデックス
          var bb = (b / this.renderedAudioBuffer.duration) * channel!.length;
          var ee = (e / this.renderedAudioBuffer.duration) * channel!.length;

          for (var ii = 0; ii < hh; ++ii) {
            //var p1 = i - 1;
            //var p2 = i;

            // 描画 Y 座標の開始、終了サンプルインデックス
            var bbb = bb + ((ee - bb) / hh) * (hh - 1 - ii);
            var eee = bb + ((ee - bb) / hh) * (hh - 1 - ii + 1);

            const renderSample = 3;

            for (var j = 0; j < renderSample; ++j) {
              var value = channel![
                Math.floor(bbb + ((eee - bbb) / renderSample) * j)
              ];

              // -1 ~ 1 を 0 ~ 1 に正規化する
              // value = value * 0.5 + 0.5; //) / 2;

              graphics
                .lineStyle(1, 0x00ff00, 0.3)
                .moveTo(x + laneWidth / 2 - (value * laneWidth) / 2, y + ii)
                .lineTo(x + laneWidth / 2 + (value * laneWidth) / 2, y + ii);
            }
          }
        }

        // 小節の中に現在時刻があるなら
        if (b <= currentTime && currentTime < e) {
          // 0 ~ 1
          const pos = (currentTime - b) / (e - b);

          const $y = y + hh - hh * pos;

          cx = x + laneWidth / 2;
          // 0 ~ 1
          cy = (hC - 1 - i + pos) / hC;

          graphics
            .lineStyle(4, 0xff0000)
            .moveTo(x, $y)
            .lineTo(x + laneWidth, $y);
        }

        if (!this.measures[index]) {
          const collider = new Measure(
            index,
            PIXI.Texture.fromImage(
              "data:image/png;base64,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"
            )
          );

          // collider.interactive = true;
          graphics.addChild(collider);

          this.measures[index] = collider;
        }

        if (!this.texts[index]) {
          let text = new PIXI.Text(index + "", {
            fontFamily: "Arial",
            fontSize: 20,
            fill: 0xffffff,
            align: "center",
            // textBaseline: "middle",
            dropShadow: true,
            dropShadowBlur: 8,
            dropShadowColor: "#000000",
            dropShadowDistance: 0
          });
          graphics.addChild(text);

          this.texts[index] = text;
        }

        const text = this.texts[index];

        text.x = x - 15;
        text.y = y;

        const sprite = this.measures[index];
        sprite.alpha = 0.4;
        sprite.x = x;
        sprite.y = y;
        sprite.width = laneWidth;
        sprite.height = hh;
        sprite.updateTransform();

        ++index;
      }
    }

    // 対象タイムラインを画面中央に配置する
    graphics.x = w / 2 - cx;

    graphics.x -= (laneWidth + padding) * (cy - 0.5);

    if (graphics.x > 0) graphics.x = 0;

    // カーソルを合わせている小節
    const targetMeasure = this.measures.find(measure =>
      measure.containsPoint(mousePosition)
    );

    const getLane = (note: INote) => {
      return chart.timeline.lanes.find(lane => lane.guid === note.lane)!;
    };
    const getMeasure = (note: INote) => this.measures[note.measureIndex];

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
      for (var i = 1; i < this.injected.editor.setting!.measureDivision; ++i) {
        const y =
          s.y + (s.height / this.injected.editor.setting!.measureDivision) * i;
        graphics
          .lineStyle(2, 0xffffff, 0.8)
          .moveTo(s.x, y)
          .lineTo(s.x + laneWidth, y);
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
      const measure = this.measures[bpm.measureIndex];

      BPMRenderer.render(bpm, graphics, measure);
    }

    // 速度変更描画
    for (const speedChange of chart.timeline.speedChanges) {
      const measure = this.measures[speedChange.measureIndex];
      SpeedRenderer.render(speedChange, graphics, measure);
    }

    // レーン中間点描画
    if (setting.objectVisibility.lanePoint) {
      for (const lanePoint of chart.timeline.lanePoints) {
        const measure = this.measures[lanePoint.measureIndex];

        getLanePointRenderer(lanePoint).render(lanePoint, graphics, measure);
      }
    }

    let targetNotePoint: NotePointInfo | null = null;

    // レーン描画
    for (const lane of chart.timeline.lanes) {
      LaneRendererResolver.resolve(lane).render(
        lane,
        graphics,
        chart.timeline.lanePointMap,
        this.measures,
        targetMeasure
      );

      //continue;

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

        targetNotePoint = LaneRendererResolver.resolve(
          lane
        ).getNotePointInfoFromMousePosition(
          lane,
          targetMeasure!,
          setting.measureDivision,
          new Vector2(mousePosition.x - graphics.x, mousePosition.y)
        );
      }
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
      NoteRendererResolver.resolve(note).render(
        note,
        graphics,
        chart.timeline.laneMap.get(note.lane)!,
        this.measures[note.measureIndex]
      );
    }

    // ノート選択 or 削除
    if (
      (setting.editMode === EditMode.Select ||
        setting.editMode === EditMode.Delete) &&
      setting.editObjectCategory === ObjectCategory.Note
    ) {
      for (const note of chart.timeline.notes) {
        const bounds = NoteRendererResolver.resolve(note)!.getBounds(
          note,
          getLane(note),
          getMeasure(note)
        );

        if (bounds.contains(mousePosition.x - graphics.x, mousePosition.y)) {
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
              editor.setInspectorTarget(note);
            }
          }
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
          this.measures[bpmChange.measureIndex]
        );

        if (bounds.contains(mousePosition.x - graphics.x, mousePosition.y)) {
          graphics
            .lineStyle(2, 0xff9900)
            .drawRect(
              bounds.x - 2,
              bounds.y - 2,
              bounds.width + 4,
              bounds.height + 4
            );
          if (isClick) {
            editor.setInspectorTarget(bpmChange);
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
          this.measures[bpmChange.measureIndex]
        );

        if (bounds.contains(mousePosition.x - graphics.x, mousePosition.y)) {
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
          this.measures[bpmChange.measureIndex]
        );

        if (bounds.contains(mousePosition.x - graphics.x, mousePosition.y)) {
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

    // ノート色を取得する
    const getNoteColor = (noteType: NoteType) => {
      if (noteType.editorProps.color === "$laneColor") {
        const laneTemplate = chart.musicGameSystem!.laneTemplateMap.get(
          targetNotePoint!.lane.templateName
        )!;

        return Number(laneTemplate.color);
      }

      return Number(noteType.editorProps.color);
    };

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
      const newNote: INote = {
        guid: guid(),
        horizontalSize: editor.setting!.objectSize,
        horizontalPosition: new Fraction(
          targetNotePoint!.horizontalIndex,
          targetNotePoint!.lane.division
        ),
        measureIndex: this.measures.findIndex(_ => _ === targetMeasure)!,
        measurePosition: new Fraction(
          setting.measureDivision - 1 - targetNotePoint!.verticalIndex!,
          setting.measureDivision
        ),
        type: newNoteType.name,
        lane: targetNotePoint!.lane.guid,
        editorProps: { color: getNoteColor(newNoteType) },
        customProps: newNoteType.customProps.reduce(
          (object: any, b: { key: string; defaultValue: any }) => {
            // カスタム色をデフォルト値にする
            if (b.defaultValue === "customColor") {
              object[b.key] = setting.customPropColor;
            } else {
              object[b.key] = b.defaultValue;
            }
            return object;
          },
          {}
        )
      } as INote;

      if (isClick) {
        chart.timeline.addNote(newNote);
      } else {
        NoteRendererResolver.resolve(newNote).render(
          newNote,
          graphics,
          targetNotePoint!.lane,
          this.measures[newNote.measureIndex]
        );
      }
    }

    const tempPoint = new PIXI.Point();
    function normalizeContainsPoint(__this: PIXI.Sprite, point: PIXI.Point) {
      __this.worldTransform.applyInverse(point, tempPoint);

      const width: number = (__this as any)._texture.orig.width;
      const height: number = (__this as any)._texture.orig.height;
      const x1 = -width * __this.anchor.x;
      let y1 = 0;

      if (tempPoint.x >= x1 && tempPoint.x < x1 + width) {
        y1 = -height * __this.anchor.y;

        if (tempPoint.y >= y1 && tempPoint.y < y1 + height) {
          const x = (tempPoint.x - x1) / (x1 + width);
          const y = (tempPoint.y - x1) / (y1 + height);

          return [x, y];
        }
      }

      return [0, 0];
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
            .getBounds(lanePoint, this.measures[lanePoint.measureIndex])
            .contains(mousePosition.x - graphics.x, mousePosition.y)
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
              this.measures
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

        if (bounds.contains(mousePosition.x - graphics.x, mousePosition.y)) {
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
              sortMeasure
            );

            const newNoteLine: NoteLine = {
              head: head.guid,
              tail: tail.guid
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
        measureIndex: targetMeasure.index,
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

      //lane.renderer.update(graphics, this.measures);

      if (isClick) {
        this.injected.editor.currentChart!.timeline.addLanePoint(newLanePoint);
      } else {
        // プレビュー

        getLanePointRenderer(newLanePoint).render(
          newLanePoint,
          graphics,
          this.measures[newLanePoint.measureIndex]
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
        measureIndex: targetMeasure.index,
        measurePosition: new Fraction(
          vlDiv - 1 - clamp(Math.floor(ny * vlDiv), 0, vlDiv - 1),
          vlDiv
        ),
        guid: guid(),
        bpm: setting.bpm
      } as BPMChange;

      if (isClick) {
        this.injected.editor.currentChart!.timeline.addBPMChange(newLanePoint);
      } else {
        // プレビュー
        BPMRenderer.render(
          newLanePoint,
          graphics,
          this.measures[newLanePoint.measureIndex]
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
      console.log("速度変更はいち");
      const [, ny] = normalizeContainsPoint(targetMeasure, mousePosition);

      const vlDiv = this.injected.editor.setting!.measureDivision;

      const clamp = (num: number, min: number, max: number) =>
        num <= min ? min : num >= max ? max : num;

      const newLanePoint = {
        measureIndex: targetMeasure.index,
        measurePosition: new Fraction(
          vlDiv - 1 - clamp(Math.floor(ny * vlDiv), 0, vlDiv - 1),
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
          this.measures[newLanePoint.measureIndex]
        );
      }
    }

    // 再生時間がノートの判定時間を超えたら SE を鳴らす
    for (const note of chart.timeline.notes) {
      // 判定時間
      const judgeTime = measureTimeInfo
        .get(note.measureIndex)!
        .GetJudgeTime(note.measureIndex + note.measurePosition.to01Number());

      // 時間が巻き戻っていたら SE 再生済みフラグをリセットする
      if (currentTime < this.previousTime && currentTime < judgeTime) {
        runInAction(() => (note.editorProps.sePlayed = false));
      }
      if (note.editorProps.sePlayed) continue;

      if (currentTime >= judgeTime) {
        // SE を鳴らす
        if (musicGameSystem.seMap.has(note.type)) {
          musicGameSystem.seMap.get(note.type)!.play();
        }
        runInAction(() => (note.editorProps.sePlayed = true));
      }
    }

    this.previousTime = currentTime;
  }

  /**
   * 譜面情報を更新する
   */
  private updateAudioInfo() {
    const currentChart = this.injected.editor.currentChart!;

    if (!currentChart) return;

    this.renderedAudioBuffer = currentChart!.audioBuffer;

    //   this.renderCanvas();
  }

  render() {
    let component = this;

    //console.log("再描画します: pixi", this.injected.editor.currentChart!.name);

    this.updateAudioInfo();

    return (
      <div
        ref={thisDiv => {
          component.container = thisDiv!;
        }}
      />
    );
  }
}
