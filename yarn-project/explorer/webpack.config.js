import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import ResolveTypeScriptPlugin from 'resolve-typescript-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import HTMLWebpackPlugin from 'html-webpack-plugin';
import webpack from 'webpack';

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
  },
  devServer: {
    historyApiFallback: true,
    port: 3000,
  },
};
