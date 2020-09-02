const path = require('path');
const webpack = require('webpack');
const merge = require('webpack-merge');
const common = require('./webpack.common');

module.exports = merge(common, {
  mode: 'development',
  devtool: 'inline-source-map',
  devServer: {
    host: '0.0.0.0',
    hot: true,
    historyApiFallback: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
      },
    },
  },
  plugins: [new webpack.HotModuleReplacementPlugin()],
  resolve: {
    // We use alias here to override all references to barretenberg and sdk, to point them to es build versions.
    // This means we can simply use 'yarn link' to establish development links to the cjs versions, which is
    // the only way to achieve a consistent project development structure that doesn't go loopy in various ways.
    //
    // For the production build we don't use any aliasing, but the package.json does import the es versions.
    // Aliasing only works if a yarn install has been performed in the alias target, which our build system
    // doesn't (and shouldn't) do. This means doing a `yarn build` locally will build a useless artifact as it's
    // symlinked to the cjs versions, but you should use the development server locally anyway.
    //
    // If you must get a valid local production artifact, copy these lines to webpack.common.js. Just don't commit them.
    alias: {
      barretenberg: path.resolve(__dirname, '../barretenberg.js/dest-es'),
      'aztec2-sdk': path.resolve(__dirname, '../sdk/dest-es'),
    },
    extensions: ['.ts', '.tsx', '.js', '.wasm'],
  },
});
