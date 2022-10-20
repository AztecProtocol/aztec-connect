import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import ResolveTypeScriptPlugin from 'resolve-typescript-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import webpack from 'webpack';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

export default {
  target: 'web',
  mode: 'production',
  entry: {
    sw: './src/core_sdk_flavours/chocolate_core_sdk/shared_worker.ts',
    if: './src/core_sdk_flavours/caramel_core_sdk/app.ts',
    main: './src/index.ts',
  },
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
    filename: '[name].js',
    library: {
      type: 'module',
    },
    chunkFormat: 'module',
  },
  experiments: {
    outputModule: true,
  },
  plugins: [
    new HtmlWebpackPlugin({ title: '', chunks: ['if'] }),
    new webpack.DefinePlugin({ 'process.env.NODE_DEBUG': false }),
    new webpack.DefinePlugin({ 'process.env.COMMIT_TAG': `"${process.env.COMMIT_TAG || ''}"` }),
    new webpack.ProvidePlugin({ Buffer: ['buffer', 'Buffer'] }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: `${path.dirname(require.resolve(`@aztec/barretenberg/wasm`))}/barretenberg.wasm`,
          to: 'barretenberg.wasm',
        },
        {
          from: `${path.dirname(require.resolve(`@aztec/barretenberg/wasm`))}/web_worker.js`,
          to: 'web_worker.js',
        },
      ],
    }),
  ],
  resolve: {
    plugins: [new ResolveTypeScriptPlugin()],
    alias: {
      './node_worker_factory.js': false,
      './node/index.js': false,
      './sql_database/index.js': false,
      leveldown: false,
    },
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
    },
  },
};
