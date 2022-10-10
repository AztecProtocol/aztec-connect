import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import ResolveTypeScriptPlugin from 'resolve-typescript-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import webpack from 'webpack';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

export default {
  target: 'web',
  mode: 'development',
  entry: './src/index.tsx',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [{ loader: 'ts-loader' }],
      },
    ],
  },
  output: {
    path: resolve(dirname(fileURLToPath(import.meta.url)), './dest'),
    filename: 'index.js',
  },
  plugins: [
    new webpack.EnvironmentPlugin({ NODE_DEBUG: false, ROLLUP_HOST: '', ETHEREUM_HOST: '' }),
    new webpack.ProvidePlugin({ Buffer: ['buffer', 'Buffer'] }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: `${path.dirname(require.resolve(`@aztec/sdk`))}/barretenberg.wasm`,
          to: 'barretenberg.wasm',
        },
        {
          from: `${path.dirname(require.resolve(`@aztec/sdk`))}/web_worker.js`,
          to: 'web_worker.js',
        },
        {
          from: './src/index.html',
          to: 'index.html',
        },
      ],
    }),
  ],
  resolve: {
    plugins: [new ResolveTypeScriptPlugin()],
    fallback: {
      crypto: false,
      os: false,
      fs: false,
      path: false,
      url: false,
      events: require.resolve('events/'),
      buffer: require.resolve('buffer/'),
      util: require.resolve('util/'),
      stream: require.resolve('stream-browserify'),
      string_decoder: require.resolve('string_decoder/'),
      assert: require.resolve('assert/'),
    },
  },
  devServer: {
    historyApiFallback: true,
  },
};
