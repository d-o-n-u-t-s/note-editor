import { observer } from "mobx-react";
import * as PIXI from "pixi.js";
import * as React from "react";
import { inject, InjectedComponent } from "../stores/inject";
import IMusicGameSystemEventListener from "../stores/musicGameSystem/eventListener";

@inject
@observer
export default class CustomCanvas extends InjectedComponent {
  private container?: HTMLDivElement;

  private apps: WeakMap<
    IMusicGameSystemEventListener,
    PIXI.Application
  > = new WeakMap<IMusicGameSystemEventListener, PIXI.Application>();

  private createPixiApplication(): PIXI.Application {
    const app = new PIXI.Application({
      width: window.innerWidth,
      height: window.innerHeight,
      antialias: false
    });

    app.view.style.width = "100%";
    app.view.style.height = "100%";

    this.container!.appendChild(app.view);

    app.stage.x = 0;
    app.stage.y = 0;

    app.ticker.add(() => {
      const w = app!.view.parentElement!.clientWidth;
      const h = app!.view.parentElement!.clientHeight;

      if (app.renderer.width !== w || app.renderer.height !== h) {
        app.renderer.resize(w, h);
      }
    });

    app.start();

    return app;
  }

  /**
   * 初期化
   */
  componentDidMount() {}

  /**
   * canvas を再描画する
   */
  private renderCanvas() {
    if (!this.injected.editor.currentChart) return;

    //console.warn("RenderCanvas!");

    const { editor } = this.injected;
    const { setting } = editor;
    const { theme, padding, measureWidth } = setting;

    const chart = editor.currentChart!;

    // 音ゲーシステムの初期化イベント
    if (!this.apps.has(chart.musicGameSystem.eventListeners)) {
      const app = this.createPixiApplication();
      const onCustomCanvasMount =
        chart.musicGameSystem.eventListeners.onCustomCanvasMount;
      if (onCustomCanvasMount) onCustomCanvasMount(chart, app);
      this.apps.set(chart.musicGameSystem.eventListeners, app);
    }

    const onCustomCanvasRender =
      chart.musicGameSystem.eventListeners.onCustomCanvasRender;
    if (onCustomCanvasRender) {
      onCustomCanvasRender(
        chart,
        this.apps.get(chart.musicGameSystem.eventListeners)!
      );
    }
  }

  private start() {
    console.log("start");
    setInterval(() => {
      this.renderCanvas();
    }, 1000 / 60);
  }

  render() {
    const component = this;

    return (
      <div
        ref={thisDiv => {
          component.container = thisDiv!;
          this.start();
        }}
      />
    );
  }
}
