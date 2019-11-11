import * as path from "path";
import * as merge from "webpack-merge";
import common from "./webpack.common";

const HtmlWebpackPlugin = require("html-webpack-plugin");
const src = path.resolve(__dirname, "./");
var HardSourceWebpackPlugin = require("hard-source-webpack-plugin");

export default merge(
  common,
  {
    mode: "development",
    devtool: "eval",

    plugins: [
      // new HardSourceWebpackPlugin(),
      new HtmlWebpackPlugin({
        template: src + "/index.dev.html",
        filename: "index.html"
      })
    ]
  },
  {
    devServer: {
      contentBase: path.join(__dirname, "dist"),
      compress: true,
      port: 9000
    }
  } as any
);
