import * as React from "react";

interface IMainProps {
  target: any;
}
interface IMainState {}

import { GUI, GUIController } from "dat-gui";

Object.defineProperty(GUI.prototype, "removeFolder", {
  value(_folder: GUI) {
    const name = _folder.name;
    var folder = this.__folders[name];
    console.warn(folder);
    if (!folder) {
      return;
    }
    folder.close();
    this.__ul.removeChild(folder.domElement.parentNode);
    delete this.__folders[name];

    // this.__folders = [];

    console.warn("削除しました", name, this, this.__folders);
    this.onResize();
  }
});

import config from "./config";
import { observable } from "mobx";
import { inject, InjectedComponent } from "./stores/inject";
import { observer } from "mobx-react";
import { Fraction } from "./math";

class Timeline {
  render() {}
}

/**
 * HotReload に対応した setInterval
 * @param symbol
 * @param callback
 * @param ms
 */
function setInterval2(
  symbol: string,
  callback: (...args: any[]) => void,
  ms: number
) {
  if ((window as any)[symbol]) {
    clearInterval((window as any)[symbol]);
  }
  (window as any)[symbol] = setInterval(callback, ms);
}

@inject
@observer
export default class Inspector extends InjectedComponent<IMainProps> {
  gameCanvas?: HTMLDivElement;

  gui = new GUI({ autoPlace: false });

  controllers: GUIController[] = [];

  removeGuis: GUI[] = [];

  bind = (target: any) => {
    console.log("いんすぺくた更新");
    let obj = JSON.parse(JSON.stringify(target));

    //    this.gui.

    for (const a of this.controllers) {
      this.gui.remove(a);
    }

    for (const a of this.removeGuis) (this.gui as any).removeFolder(a);
    this.controllers = [];
    this.removeGuis = [];

    var add = (gui: GUI, obj: any) => {
      for (const key of Object.keys(obj)) {
        console.log(key, obj[key]);

        if (obj[key] instanceof Object) {
          var f2 = gui.addFolder(key);

          this.removeGuis.push(f2);

          add(f2, obj[key]);

          //var n2 = f2.add({ a: 1 }, "a");
          // this.controllers.push(n2);
          /*
  f2.add(obj[key], 'growthSpeed');
  f2.add(text, 'maxSize');
  f2.add(obj[key], 'message');
  
  */

          continue;
        }

        var n: any = null;

        if (key.toLowerCase().includes("color")) {
          obj[key] = obj[key].replace("0x", "#");

          n = gui.addColor(obj, key);
          //       continue;
        } else {
          // if (key === "color") {
          //n = this.gui.addColor(obj, "color");
          //} else
          n = gui.add(obj, key);
        }

        n.onChange((a: any) => {
          if (key === "scale") {
            //  scale = a;
          }
          //  console.log(key, a);
        });

        if (gui === this.gui) {
          this.controllers.push(n);
        }
      }
    };

    add(this.gui, obj);

    //  this.gui.add

    //  this.componentDidMount();
  };

  componentDidMount() {
    const gui = this.gui;
    var size = config.sidebarWidth;

    var scale = 1.2;

    console.log(this.props.target);

    //gui.updateDisplay();

    gui.domElement.querySelector(".close-button")!.remove();

    (window as any).GUI = GUI;

    setInterval(() => {
      const w = gui.domElement.offsetWidth;
      const h = gui.domElement.offsetHeight;
      gui.domElement.style.transform = `scale(${scale})`;

      gui.width = size * (1 / scale);

      gui.domElement.style.marginLeft = `${(w * scale - w) / 2}`;
      gui.domElement.style.marginTop = `${(h * scale - h) / 2}`;
      gui.domElement.style.marginBottom = `${(h * scale - h) / 2}`;
    }, 100);

    this.gameCanvas!.appendChild(gui.domElement);
  }

  componentWillUnmount() {}

  render() {
    console.log("INspector 再描画");
    this.bind(this.injected.editor.inspectorTarget);

    let component = this;
    return (
      <div>
        <div
          ref={thisDiv => {
            component.gameCanvas = thisDiv!;
          }}
        />
        {JSON.stringify(this.injected.editor.inspectorTarget)}
      </div>
    );
  }
}
