const webpack = require('@nativescript/webpack');

module.exports = (env) => {
  webpack.init(env);

  // Learn how to customize:
  // https://docs.nativescript.org/webpack
  webpack.chainWebpack((config, env) => {
    if (env.karmaWebpack) {
      // TODO: remove after https://github.com/NativeScript/nativescript-unit-test-runner/pull/49
      config.module.rules.delete('angular');
    }
  });

  return webpack.resolveConfig();
};
