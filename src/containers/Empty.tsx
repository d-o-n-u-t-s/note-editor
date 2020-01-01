import * as React from "react";
import NewChartDialog from "../components/NewChartDialog";

export default function Empty() {
  return (
    <div>
      譜面が存在しません
      <br />
      <NewChartDialog />
    </div>
  );
}
