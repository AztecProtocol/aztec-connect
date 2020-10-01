const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = env => ({
  mode: env,
  devtool: 'inline-source-map',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'babel-loader',
          },
        ],
        exclude: /node_modules/,
      },
      {
        test: /\.(png|jpe?g|gif|woff|woff2|eot|ttf)$/,
        loader: 'file-loader?limit=100000',
        options: {
          name: '[name].[ext]',
        },
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
    ],
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: '[name].css',
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'src/assets',
        },
        {
          from: 'node_modules/@aztec/sdk/*.(wasm|worker.js)',
          to: '[name].[ext]',
        },
      ],
    }),
  ],
  optimization:
    env === 'production'
      ? {
          minimize: false,
          minimizer: [
            new TerserPlugin({
              terserOptions: {
                keep_fnames: true,
              },
            }),
          ],
        }
      : undefined,
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.wasm'],
  },
  devServer:
    env === 'development'
      ? {
          hot: true,
        }
      : undefined,
  output: {
    globalObject: 'this',
    publicPath: '/',
  },
  node: {
    fs: 'empty',
  },
});
