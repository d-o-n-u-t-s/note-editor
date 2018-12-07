import { GUI, GUIController } from "dat-gui";
import { observer } from "mobx-react";
import * as React from "react";
import config from "../config";
import { inject, InjectedComponent } from "../stores/inject";
import guiUtil from "../utils/GuiUtility";

/**
 * フォルダを削除する GUI#removeFolder を定義
 */
Object.defineProperty(GUI.prototype, "removeFolder", {
  value(targetFolder: GUI) {
    const { name } = targetFolder;
    const folder = this.__folders[name];
    if (!folder) return;
    folder.close();
    this.__ul.removeChild(folder.domElement.parentNode);
    delete this.__folders[name];
    this.onResize();
  }
});

/**
 * インスペクタコンポーネント
 */
@inject
@observer
export default class Inspector extends InjectedComponent {
  constructor(props: any) {
    super(props);
    guiUtil.gui = this.gui;
  }

  gameCanvas?: HTMLDivElement;

  gui = new GUI({ autoPlace: false });
  folders: GUI[] = [];
  controllers: GUIController[] = [];

  /**
   * オブジェクトをインスペクタにバインドする
   */
  bind(target: any) {
    if (!target) return;

    console.log("update inspector", target);

    // 既存のコントローラーを削除する
    for (const controller of this.controllers) {
      this.gui.remove(controller);
    }

    // 既存のフォルダを削除する
    for (const folder of this.folders) (this.gui as any).removeFolder(folder);

    this.controllers = [];
    this.folders = [];

    // onRenderInspector
    if (
      this.injected.editor.currentChart! &&
      this.injected.editor.currentChart!.musicGameSystem
    ) {
      const onRenderInspector = this.injected.editor.currentChart!
        .musicGameSystem!.eventListeners.onRenderInspector;
      if (onRenderInspector) onRenderInspector(this.gui, guiUtil);
    }

    // プロパティを追加する
    const add = (gui: GUI, obj: any, parent: any) => {
      if (obj.toJS) {
        obj = obj.toJS();
      }

      const config = obj.inspectorConfig || {};

      for (const key of Object.keys(obj)) {
        if (key == "inspectorConfig") continue;

        // オブジェクトなら再帰
        if (obj[key] instanceof Object) {
          const folder = gui.addFolder(key);
          this.folders.push(folder);
          add(folder, obj[key], parent[key]);
          folder.open();
          continue;
        }

        let newController: GUIController | null = null;

        const isColor = obj[key].toString().match(/^#[0-9A-F]{6}$/i);

        if (isColor) {
          // 数値形式なら #nnnnnn 形式の文字列にする
          if (typeof obj[key] === "number") {
            obj[key] = "#" + obj[key].toString(16).padStart(6, "0");
          } else {
            obj[key] = obj[key].replace("0x", "#");
          }

          newController = gui.addColor(obj, key);
        } else {
          newController = gui.add(obj, key);
        }

        // configの適用
        if (config[key]) {
          for (const method of Object.keys(config[key])) {
            newController = (newController as any)[method](
              config[key][method]
            ) as GUIController;
          }
        }

        // 値の反映
        newController.onChange((value: any) => {
          if (parent.setValue) {
            parent.setValue(key, value);
          } else {
            parent[key] = value;
          }
        });

        // 値を更新したら保存
        newController.onFinishChange(() => {
          // TODO: 特定のオブジェクトの場合だけ時間を更新するようにする
          this.injected.editor.currentChart!.timeline.calculateTime();
          this.injected.editor.currentChart!.save();
        });

        if (gui === this.gui) {
          this.controllers.push(newController);
        }
      }
    };

    add(this.gui, target, target);
  }

  guiScale = 1.2;

  componentDidMount() {
    const gui = this.gui;
    const size = config.sidebarWidth;
    const scale = this.guiScale;

    gui.domElement.querySelector(".close-button")!.remove();

    (window as any).GUI = GUI;

    setInterval(() => {
      const w = gui.domElement.offsetWidth;
      const h = gui.domElement.offsetHeight;
      gui.domElement.style.transform = `scale(${scale})`;

      gui.width = size * (1 / scale);

      gui.domElement.style.marginLeft = `${(w * scale - w) / 2}px`;
      gui.domElement.style.marginTop = `${(h * scale - h) / 2}px`;
      gui.domElement.style.marginBottom = `${(h * scale - h) / 2}px`;
    }, 100);

    this.gameCanvas!.appendChild(gui.domElement);
  }

  render() {
    this.bind(this.injected.editor.inspectorTargets);

    let component = this;
    return (
      <div>
        <div
          ref={thisDiv => {
            component.gameCanvas = thisDiv!;
          }}
        />
      </div>
    );
  }
}
