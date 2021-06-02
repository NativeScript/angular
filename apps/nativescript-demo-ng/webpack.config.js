const webpack = require('@nativescript/webpack');
const { join } = require('path');

module.exports = (env) => {
  webpack.init(env);

  // Learn how to customize:
  // https://docs.nativescript.org/webpack

  webpack.chainWebpack((config, env) => {
    if (env.karmaWebpack) {
      config.plugins.delete('WatchStatePlugin');
      config.plugins.delete('AngularCompilerPlugin');
      config.plugins.delete('AngularWebpackPlugin');
    }
  });

  return webpack.resolveConfig();
};
