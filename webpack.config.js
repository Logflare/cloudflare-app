const path = require("path")
const webpack = require("webpack")

const isDev = process.env.NODE_ENV !== "production"
const CF_APP_VERSION = JSON.stringify(require("./package.json").version)
const INSTALL_OPTIONS = JSON.stringify(require("./staging/install_options.js"))

module.exports = {
  mode: "development",
  devtool: "hidden-source-map",
  entry: {
    // index: "./src/index.js",
    worker: "./workers/worker.js",
  },
  output: {
    filename: "[name].js",
    sourceMapFilename: "[name].map",
    path: path.resolve(__dirname, "build"),
  },
  plugins: [
    new webpack.DefinePlugin({
      isDev,
      CF_APP_VERSION,
      INSTALL_OPTIONS,
    }),
  ],
  target: "webworker",
}
