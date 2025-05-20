const webpack = require('@nativescript/webpack');
const { ProvidePlugin } = require("webpack");

module.exports = (env) => {
  webpack.init(env);
  webpack.useConfig('angular');

  webpack.chainWebpack((config) => {
    config.resolve.set('fallback', {
      AbortController: require.resolve('@nativescript/core/abortcontroller'),
      AbortSignal: require.resolve('@nativescript/core/abortcontroller'),
    });
  });

  return webpack.resolveConfig();
};
