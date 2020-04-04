const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
const ThreadsPlugin = require('threads-plugin');

module.exports = {
  mode: 'development',
  devtool: 'inline-source-map',
  entry: './src/index.tsx',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
            },
          },
        ],
        exclude: /node_modules/,
      },
      {
        test: /barretenberg\.wasm$/,
        type: 'javascript/auto',
        loader: 'file-loader',
        options: {
          name: 'barretenberg.wasm',
          publicPath: 'dist/',
        },
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.wasm'],
  },
  devServer: {
    hot: true,
  },
  output: {
    globalObject: 'this'
  },
  plugins: [
    new HtmlWebpackPlugin({ template: './src/index.html' }),
    new webpack.HotModuleReplacementPlugin(),
    new ThreadsPlugin(),
  ],
  node: {
    fs: 'empty',
  },
};
