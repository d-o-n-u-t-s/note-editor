import { observer } from "mobx-react";
import * as React from "react";
import { useStores } from "../stores/stores";
import Empty from "./Empty";
import Pixi from "./Pixi";

export default observer(function ChartEditor() {
  const { editor } = useStores();

  return <>{editor.currentChart ? <Pixi /> : <Empty />}</>;
});
