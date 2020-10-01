const CopyWebpackPlugin = require('copy-webpack-plugin');
const ThreadsPlugin = require('threads-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const path = require('path');
const webpack = require('webpack');
const { merge } = require('webpack-merge');

const common = {
  mode: 'production',
  entry: './src/index.ts',
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: [
          {
            loader: 'babel-loader',
          },
        ],
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          keep_classnames: true,
        },
      }),
    ],
  },
  output: {
    path: path.resolve(__dirname, './dist'),
    filename: 'aztec-sdk.js',
    globalObject: 'this',
    publicPath: '/',
    library: 'aztec2-sdk',
    libraryTarget: 'umd',
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('production'),
    }),
    new ThreadsPlugin(),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'node_modules/barretenberg/**/*.wasm',
          to: '[name].[ext]',
        },
        {
          from: 'node_modules/barretenberg/**/*.d.ts',
          transformPath(targetPath) {
            return targetPath.replace(/^node_modules\//, '');
          },
        },
      ],
    }),
  ],
};

const nodeConfig = merge(common, {
  output: { filename: 'aztec-sdk.node.js' },
  plugins: [new webpack.ExternalsPlugin('commonjs', ['leveldown', 'threads'])],
  target: 'node',
  node: {
    __dirname: false,
    __filename: false,
  },
});

const webConfig = merge(common, {
  output: { filename: 'aztec-sdk.web.js' },
  target: 'web',
  node: {
    fs: 'empty',
  },
});

module.exports = [nodeConfig, webConfig];
