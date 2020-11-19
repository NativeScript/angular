const webpack = require('@nativescript/webpack');
const { join } = require('path');

module.exports = (env) => {
  webpack.init(env);

  // Learn how to customize:
  // https://docs.nativescript.org/webpack

  return webpack.resolveConfig();
};
