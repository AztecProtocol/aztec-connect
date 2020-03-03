const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

module.exports = {
  mode: 'development',
  devtool: 'inline-source-map',
  entry: './src/index.ts',
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
        type: "javascript/auto",
        loader: "file-loader",
        options: {
          name: "barretenberg.wasm",
          publicPath: "dist/"
        }
      }
    ],
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.wasm'],
  },
  devServer: {
    hot: true,
  },
  plugins: [new HtmlWebpackPlugin({ template: './src/index.html' }), new webpack.HotModuleReplacementPlugin()],
  node: {
    fs: 'empty',
  },
};
