import * as React from "react";

interface IMainProps {
  target: any;
}
interface IMainState {}

import { GUI } from "dat-gui";

import config from "./config";

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

export default class Inspector extends React.Component<IMainProps, IMainState> {
  gameCanvas?: HTMLDivElement;

  componentDidMount() {
    var size = config.sidebarWidth;

    var scale = 1.2;

    console.log(this.props.target);

    const gui: GUI = new GUI({ autoPlace: false });

    //gui.updateDisplay();

    let obj = {
      message: "Hello World",
      displayOutline: false,
      maxSize: 6.0,
      scale: 5,
      aaa: "[1, 2, 3]"
    };

    gui.domElement.querySelector(".close-button")!.remove();

    for (const key of Object.keys(obj)) {
      var n = gui.add(obj, key);
      n.onChange((a: any) => {
        if (key === "scale") {
          scale = a;
        }
        //  console.log(key, a);
      });
    }

    (window as any).GUI = GUI;

    setInterval2(
      "sym",
      () => {
        const w = gui.domElement.offsetWidth;
        const h = gui.domElement.offsetHeight;
        gui.domElement.style.transform = `scale(${scale})`;

        gui.width = size * (1 / scale);

        gui.domElement.style.marginLeft = `${(w * scale - w) / 2}`;
        gui.domElement.style.marginTop = `${(h * scale - h) / 2}`;
        gui.domElement.style.marginBottom = `${(h * scale - h) / 2}`;
      },
      100
    );

    this.gameCanvas!.appendChild(gui.domElement);
  }

  componentWillUnmount() {}

  render() {
    let component = this;
    return (
      <div
        ref={thisDiv => {
          component.gameCanvas = thisDiv!;
        }}
      />
    );
  }
}
