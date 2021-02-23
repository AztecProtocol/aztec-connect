const { merge } = require('webpack-merge');
const webpackConfig = require('./webpack.ext');

module.exports = {
  webpack: function(config) {
    return merge(config, webpackConfig);
  },
};
