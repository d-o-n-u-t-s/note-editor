import * as React from "react";

interface IMainProps {
  target: any;
}
interface IMainState {}

import { GUI, GUIController } from "dat-gui";

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

  bind = (target: any) => {
    let obj = target;

    //    this.gui.

    for (const a of this.controllers) {
      this.gui.remove(a);
    }
    this.controllers = [];

    for (const key of Object.keys(obj)) {
      console.log(key, obj[key]);

      if (obj[key] instanceof Fraction) {
        continue;
      }

      var n: any = null;

      // if (key === "color") {
      //n = this.gui.addColor(obj, "color");
      //} else
      n = this.gui.add(obj, key);

      n.onChange((a: any) => {
        if (key === "scale") {
          //  scale = a;
        }
        //  console.log(key, a);
      });
      this.controllers.push(n);
    }

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
