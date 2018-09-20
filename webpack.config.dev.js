const path = require('path');

const HtmlWebpackPlugin = require('html-webpack-plugin');
const src = path.resolve(__dirname, './');
var HardSourceWebpackPlugin = require('hard-source-webpack-plugin');

module.exports = {
  entry: './assets/ts/index.tsx',
  output: {
    filename: './dist/bundle.js'
  },

  mode: 'development',

  devtool: 'eval',

  resolve: {
    extensions: ['.ts', '.tsx', '.js']
  },

  devServer: {
    contentBase: path.join(__dirname, 'dist'),
    compress: true,
    port: 9000
  },

  plugins: [
    new HardSourceWebpackPlugin(),
    new HtmlWebpackPlugin({
      template: src + '/index.html',
      filename: 'index.html'
    })
  ],

  externals: {
    "pixi.js": "PIXI",
    "react": "React",
    "react-dom": "ReactDOM",
    "mobx": "mobx",
    "mobx-react": "mobxReact",
    "material-ui": "window['material-ui']"
  },

  module: {
    rules: [{
      test: /\.tsx?$/,
      use: [{
        loader: 'ts-loader'
      }]
    }, {
      test: /\.wav?$/,
      use: [{
        loader: 'url-loader'
      }]
    }]
  }
};