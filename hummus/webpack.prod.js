const HtmlWebpackPlugin = require('html-webpack-plugin');
const ThreadsPlugin = require('threads-plugin');

module.exports = {
  mode: 'production',
  devtool: 'source-map',
  entry: './src/index.tsx',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: ['ts-loader'],
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
  plugins: [
    new HtmlWebpackPlugin({ template: './src/index.html' }),
    new ThreadsPlugin(),
  ],
  node: {
    fs: 'empty',
  },
  output: {
    globalObject: 'this'
  },
};
