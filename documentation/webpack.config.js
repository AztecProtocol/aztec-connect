const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const ThreadsPlugin = require('threads-plugin');

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
  plugins: [
    new MiniCssExtractPlugin({
      filename: '[name].css',
    }),
    new ThreadsPlugin(),
  ],
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.wasm'],
    alias: {
      '@aztec/sdk': 'aztec2-sdk',
    },
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
