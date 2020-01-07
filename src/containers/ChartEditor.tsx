import { observer } from "mobx-react";
import * as React from "react";
import { useStores } from "../stores/stores";
import Empty from "./Empty";
import Pixi from "./Pixi";

export default observer(function ChartEditor() {
  const { editor } = useStores();

  return (
    <>
      <div
        style={{
          marginTop: editor.setting.tabHeight + 48
        }}
      />
      {editor.currentChart ? (
        <div style={{ flex: 1, display: "flex" }}>
          <Pixi />
        </div>
      ) : (
        <Empty />
      )}
    </>
  );
});
