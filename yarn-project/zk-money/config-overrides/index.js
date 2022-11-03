const CopyWebpackPlugin = require('copy-webpack-plugin');
const ResolveTypeScriptPlugin = require('resolve-typescript-plugin');
const path = require('path');
const webpack = require('webpack');
const { override } = require('customize-cra');

function stuff(config) {
  config.resolve = {
    plugins: [new ResolveTypeScriptPlugin()],
    fallback: {
      crypto: false,
      os: false,
      fs: false,
      path: false,
      url: false,
      http: false,
      https: false,
      assert: require.resolve('assert/'),
      events: require.resolve('events/'),
      buffer: require.resolve('buffer/'),
      util: require.resolve('util/'),
      stream: require.resolve('stream-browserify'),
      string_decoder: require.resolve('string_decoder/'),
    },
  };
  config.plugins.push(
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
      ],
    }),
  );

  return config;
}

const addIgnoreSourcemapsloaderWarnings = config => {
  config.ignoreWarnings = [
    // Ignore warnings raised by source-map-loader.
    // Some third party packages may ship mis-configured sourcemaps.
    // See: https://github.com/facebook/create-react-app/discussions/11278#discussioncomment-1780169
    function ignoreSourcemapsloaderWarnings(warning) {
      return (
        warning.module &&
        warning.module.resource.includes('node_modules') &&
        warning.details &&
        warning.details.includes('source-map-loader')
      );
    },
  ];
  return config;
};

module.exports = override(stuff, addIgnoreSourcemapsloaderWarnings);
