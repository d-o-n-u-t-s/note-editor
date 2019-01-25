export default {
  entry: "./src/index.tsx",
  output: {
    filename: "./dist/bundle.js"
  },

  resolve: {
    extensions: [".ts", ".tsx", ".js"]
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
