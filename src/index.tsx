import { configure } from "mobx";
import * as React from "react";
import * as ReactDOM from "react-dom";
import Application from "./containers/Application";

configure({
  enforceActions: "observed"
});

import { Record, Collection, List, fromJS } from "immutable";

type FractionData = {
  d: number;
  n: number;
};

class FractionRecord extends Record<FractionData>({
  d: 1,
  n: 0
}) {}

type NoteData = {
  a: number;
  b: number;
  position: FractionData;
};

type ChartData = {
  notes: List<NoteRecord>;
};

class ChartRecord extends Record<ChartData>({
  notes: List<NoteRecord>()
}) {}

class NoteRecord extends Record<NoteData>({
  a: 1,
  b: 2,
  position: new FractionRecord()
}) {
  c = false;

  getAB() {
    return this.a + this.b;
  }
}

const jsonChartData = {
  notes: [
    {
      a: 1,
      b: 1,
      position: {
        n: 8,
        d: 16
      }
    }
  ]
};

const chart = new ChartRecord(fromJS(jsonChartData));

console.log(chart.toJS());

ReactDOM.render(<Application />, document.getElementById("app"));
