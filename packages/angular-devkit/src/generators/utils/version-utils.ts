import { readJson, type Tree } from '@nx/devkit';
import { clean, coerce, major } from 'semver';
const angularVersion = '~18.2.0';

export function getInstalledAngularVersion(tree: Tree): string {
  const pkgJson = readJson(tree, 'package.json');
  const installedAngularVersion = pkgJson.dependencies && pkgJson.dependencies['@angular/core'];

  if (!installedAngularVersion || installedAngularVersion === 'latest' || installedAngularVersion === 'next') {
    return clean(angularVersion) ?? coerce(angularVersion).version;
  }

  return clean(installedAngularVersion) ?? coerce(installedAngularVersion).version;
}

export function getInstalledAngularMajorVersion(tree: Tree): number {
  return major(getInstalledAngularVersion(tree));
}

export function getInstalledAngularVersionInfo(tree: Tree) {
  const installedVersion = getInstalledAngularVersion(tree);

  return {
    version: installedVersion,
    major: major(installedVersion),
  };
}
