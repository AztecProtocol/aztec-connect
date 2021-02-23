const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'node_modules/@aztec/sdk/(*\.wasm|worker*\.js)',
          to: '[name].[ext]',
        },
      ],
    }),
  ],
};
