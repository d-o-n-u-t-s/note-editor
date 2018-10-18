import * as React from "react";
import * as ReactDOM from "react-dom";

import Application from "./containers/Application";

import { configure } from "mobx";

configure({
  enforceActions: "observed"
});

ReactDOM.render(<Application />, document.getElementById("app"));
