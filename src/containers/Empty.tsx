import { Box } from "@material-ui/core";
import * as React from "react";

export default function Empty() {
  return (
    <Box color="text.primary" fontSize="h6.fontSize" style={{ margin: "2rem" }}>
      譜面が存在しません
    </Box>
  );
}
