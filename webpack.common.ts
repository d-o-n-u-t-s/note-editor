import { Configuration } from "webpack";

const configuration: Configuration = {
  entry: "./src/index.tsx",
  output: {
    filename: "./dist/bundle.js"
  },
  target: "electron-renderer",
  resolve: {
    extensions: [".ts", ".tsx", ".js"]
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)?$/,
        use: [
          {
            loader: "ts-loader"
          }
        ],
        exclude: [/assets/, /node_modules/]
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

export default configuration;
