import * as path from "path";

const HtmlWebpackPlugin = require("html-webpack-plugin");
const src = path.resolve(__dirname, "./");
var HardSourceWebpackPlugin = require("hard-source-webpack-plugin");

export default {
  entry: "./src/index.tsx",
  output: {
    filename: "./dist/bundle.js"
  },

  resolve: {
    extensions: [".ts", ".tsx", ".js"]
  },

  plugins: [
    new HardSourceWebpackPlugin(),
    new HtmlWebpackPlugin({
      template: src + "/index.html",
      filename: "index.html"
    })
  ],

  externals: {
    "pixi.js": "PIXI",
    react: "React",
    "react-dom": "ReactDOM",
    mobx: "mobx",
    "mobx-react": "mobxReact",
    "material-ui": "window['material-ui']"
  },

  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: "ts-loader"
          }
        ]
      },
      {
        test: /\.(wav|mp3)?$/,
        use: [
          {
            loader: "url-loader"
          }
        ]
      }
    ]
  }
};
