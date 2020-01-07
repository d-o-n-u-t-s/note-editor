import * as path from "path";
import merge from "webpack-merge";
import common from "./webpack.common";

const HtmlWebpackPlugin = require("html-webpack-plugin");
const src = path.resolve(__dirname, "./");

export default merge(common, {
  mode: "production",
  devtool: "source-map",

  plugins: [
    new HtmlWebpackPlugin({
      template: src + "/index.prod.html",
      filename: "index.html"
    })
  ]
});
