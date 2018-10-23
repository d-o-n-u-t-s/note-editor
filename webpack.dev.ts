import * as path from "path";
import * as merge from "webpack-merge";
import common from "./webpack.common";

export default merge(
  common,
  {
    mode: "development",
    devtool: "eval"
  },
  {
    devServer: {
      contentBase: path.join(__dirname, "dist"),
      compress: true,
      port: 9000
    }
  } as any
);
