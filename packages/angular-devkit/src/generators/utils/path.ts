import { joinPathFragments, workspaceRoot, normalizePath } from '@nx/devkit';
import { basename, dirname, relative } from 'path';

export function getRelativeImportToFile(sourceFilePath: string, targetFilePath: string): string {
  const relativeDirToTarget = relative(dirname(sourceFilePath), dirname(targetFilePath));

  return `./${joinPathFragments(relativeDirToTarget, basename(targetFilePath, '.ts'))}`;
}

function getCwd(): string {
  return process.env.INIT_CWD?.startsWith(workspaceRoot) ? process.env.INIT_CWD : process.cwd();
}

export function getRelativeCwd(): string {
  return normalizePath(relative(workspaceRoot, getCwd()));
}

export function extractNameAndDirectoryFromPath(path: string): {
  name: string;
  directory: string;
} {
  // Remove trailing slash
  path = path.replace(/\/$/, '');

  const parsedPath = normalizePath(path).split('/');
  const name = parsedPath.pop();
  const directory = parsedPath.join('/');

  return { name, directory };
}
