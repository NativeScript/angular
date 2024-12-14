import type { Tree } from '@nx/devkit';
import { joinPathFragments, readJson } from '@nx/devkit';
import { dirname } from 'path';

export function locateLibraryEntryPointFromDirectory(tree: Tree, directory: string, projectRoot: string, projectSourceRoot: string): string | null {
  const ngPackageJsonPath = joinPathFragments(directory, 'ng-package.json');
  const entryPointFile = tree.exists(ngPackageJsonPath) ? readJson(tree, ngPackageJsonPath).lib?.entryFile ?? 'src/public_api.ts' : null;

  if (entryPointFile) {
    return joinPathFragments(directory, entryPointFile);
  }

  if (directory === projectRoot) {
    const indexFile = joinPathFragments(projectSourceRoot, 'index.ts');

    return tree.exists(indexFile) ? indexFile : null;
  }

  return locateLibraryEntryPointFromDirectory(tree, dirname(directory), projectRoot, projectSourceRoot);
}
