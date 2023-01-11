import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import ResolveTypeScriptPlugin from 'resolve-typescript-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import HTMLWebpackPlugin from 'html-webpack-plugin';
import webpack from 'webpack';

import { createRequire } from 'module';

const require = createRequire(import.meta.url);

export default {
  target: 'web',
  mode: 'production',
  entry: './src/index.tsx',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [{ loader: 'ts-loader' }],
      },
      {
        test: /\.(woff(2)?|ttf|eot)(\?v=\d+\.\d+\.\d+)?$/,
        type: 'asset/resource',
      },
      {
        test: /\.svg$/,
        type: 'asset/inline',
      },
      {
        test: /\.png$/,
        type: 'asset/resource',
      },
    ],
  },
  output: {
    path: resolve(dirname(fileURLToPath(import.meta.url)), './dest'),
    publicPath: '/',
    filename: 'index.js',
  },
  plugins: [
    new webpack.DefinePlugin({ 'process.env.NODE_DEBUG': false }),
    new webpack.ProvidePlugin({ Buffer: ['buffer', 'Buffer'] }),
    new CopyWebpackPlugin({
      patterns: [{ from: 'src/public', to: 'public' }],
    }),
    new HTMLWebpackPlugin({ template: 'src/index.html' }),
  ],
  resolve: {
    plugins: [new ResolveTypeScriptPlugin()],
    fallback: {
      crypto: false,
      os: false,
      fs: false,
      path: false,
      url: false,
      worker_threads: false,
      stream: false,
      string_decoder: false,
      events: require.resolve('events/'),
      buffer: require.resolve('buffer/'),
      util: require.resolve('util/'),
    },
  },
  devServer: {
    historyApiFallback: true,
    port: 3000,
  },
};
