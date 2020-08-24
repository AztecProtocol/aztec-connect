const path = require('path');
const webpack = require('webpack');
const merge = require('webpack-merge');
const common = require('./webpack.common');

module.exports = merge(common, {
  mode: 'development',
  devtool: 'inline-source-map',
  devServer: {
    hot: true,
    historyApiFallback: true,
  },
  plugins: [new webpack.HotModuleReplacementPlugin()],
  resolve: {
    // We use alias here to override all references to barretenberg and sdk, to point them to es build versions.
    // This means we can simply use 'yarn link' to establish development links to the cjs versions, which is
    // the only way to achieve a consistent project development structure that doesn't go loopy in various ways.
    // For the production build we don't use any aliasing, but the package.json does import the es versions.
    alias: {
      barretenberg: path.resolve(__dirname, '../barretenberg.js/dest-es'),
      'aztec2-sdk': path.resolve(__dirname, '../sdk/dest-es'),
    },
    extensions: ['.ts', '.tsx', '.js', '.wasm'],
  },
});
