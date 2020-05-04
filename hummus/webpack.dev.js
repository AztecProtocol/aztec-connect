const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
const ThreadsPlugin = require('threads-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

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
      {
        test: /\.scss$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
          },
          {
            loader: 'css-loader',
            options: {
              importLoaders: 1,
              modules: {
                localIdentName: '[name]_[local]__[hash:base64:3]',
              },
            },
          },
          {
            loader: 'postcss-loader',
            options: {
              plugins: () => [require('autoprefixer')],
              sourceMap: true,
            },
          },
          {
            loader: 'sass-loader',
            options: {
              sassOptions: {
                includePaths: [
                  path.resolve(__dirname, 'src'),
                ],
                sourceMap: true,
              },
            },
          },
        ],
      },
      {
        test: /\.css$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
          },
          'css-loader',
        ],
      },
      {
        test: /\.(png|jpe?g|gif|woff|woff2|eot|ttf)$/,
        loader: 'file-loader?limit=100000',
        options: {
          outputPath: 'static',
          publicPath: 'dist/static',
          name: '[name].[ext]',
        },
      },
      {
        test: /\.svg$/,
        use: [
          {
            loader: 'svg-sprite-loader',
            options: {
              name: '[name]_[hash:base64:3]',
              extract: false,
            },
          },
        ],
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.wasm'],
    alias: {
      'barretenberg-es': path.resolve(__dirname, '../barretenberg.js/dest-es'),
    },
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
    new MiniCssExtractPlugin({
      filename: '[name].css',
    }),
  ],
  node: {
    fs: 'empty',
  },
};
