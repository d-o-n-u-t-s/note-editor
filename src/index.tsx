import { configure } from "mobx";
import * as React from "react";
import * as ReactDOM from "react-dom";
import Application from "./containers/Application";

configure({
  enforceActions: "observed"
});

ReactDOM.render(<Application />, document.getElementById("app"));
