import type { ProjectConfiguration, Tree } from '@nx/devkit';
import { getProjects, joinPathFragments, normalizePath, workspaceRoot } from '@nx/devkit';
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

export type ProjectRootMappings = Map<string, string>;
export type ArtifactGenerationOptions = {
  path: string;
  name?: string;
  fileExtension?: 'js' | 'jsx' | 'ts' | 'tsx' | 'vue';
  fileName?: string;
  suffix?: string;
};

export type NameAndDirectoryOptions = {
  /**
   * Normalized artifact name.
   */
  artifactName: string;
  /**
   * Normalized directory path where the artifact will be generated.
   */
  directory: string;
  /**
   * Normalized file name of the artifact without the extension.
   */
  fileName: string;
  /**
   * Normalized full file path of the artifact.
   */
  filePath: string;
  /**
   * Project name where the artifact will be generated.
   */
  project: string;
};

/**
 * Locates a project in projectRootMap based on a file within it
 * @param filePath path that is inside of projectName. This should be relative from the workspace root
 * @param projectRootMap Map<projectRoot, projectName> Use {@link createProjectRootMappings} to create this
 */
export function findProjectForPath(filePath: string, projectRootMap: ProjectRootMappings): string | null {
  /**
   * Project Mappings are in UNIX-style file paths
   * Windows may pass Win-style file paths
   * Ensure filePath is in UNIX-style
   */
  let currentPath = normalizePath(filePath);
  for (; currentPath != dirname(currentPath); currentPath = dirname(currentPath)) {
    const p = projectRootMap.get(currentPath);
    if (p) {
      return p;
    }
  }
  return projectRootMap.get(currentPath);
}

export function normalizeProjectRoot(root: string) {
  root = root === '' ? '.' : root;
  return root && root.endsWith('/') ? root.substring(0, root.length - 1) : root;
}
/**
 * This creates a map of project roots to project names to easily look up the project of a file
 * @param projects This is the map of project configurations commonly found in "workspace.json"
 */
export function createProjectRootMappingsFromProjectConfigurations(projects: Record<string, ProjectConfiguration>) {
  const projectRootMappings: ProjectRootMappings = new Map();
  for (const { name, root } of Object.values(projects)) {
    projectRootMappings.set(normalizeProjectRoot(root), name);
  }
  return projectRootMappings;
}

function findProjectFromPath(tree: Tree, path: string): string | null {
  const projectConfigurations: Record<string, ProjectConfiguration> = {};
  const projects = getProjects(tree);
  for (const [projectName, project] of projects) {
    projectConfigurations[projectName] = project;
  }
  const projectRootMappings = createProjectRootMappingsFromProjectConfigurations(projectConfigurations);

  return findProjectForPath(path, projectRootMappings);
}

export async function determineArtifactNameAndDirectoryOptions(tree: Tree, options: ArtifactGenerationOptions): Promise<NameAndDirectoryOptions> {
  const normalizedOptions = getNameAndDirectoryOptions(tree, options);

  validateResolvedProject(normalizedOptions.project, normalizedOptions.directory);

  return normalizedOptions;
}

function validateResolvedProject(project: string | undefined, normalizedDirectory: string): void {
  if (project) {
    return;
  }

  throw new Error(`The provided directory resolved relative to the current working directory "${normalizedDirectory}" does not exist under any project root. ` + `Please make sure to navigate to a location or provide a directory that exists under a project root.`);
}

function getNameAndDirectoryOptions(tree: Tree, options: ArtifactGenerationOptions) {
  const path = options.path ? normalizePath(options.path.replace(/^\.?\//, '')) : undefined;
  const fileExtension = options.fileExtension ?? 'ts';
  // eslint-disable-next-line prefer-const
  let { name: extractedName, directory } = extractNameAndDirectoryFromPath(path);
  const relativeCwd = getRelativeCwd();

  // append the directory to the current working directory if it doesn't start with it
  if (directory !== relativeCwd && !directory.startsWith(`${relativeCwd}/`)) {
    directory = joinPathFragments(relativeCwd, directory);
  }

  const project = findProjectFromPath(tree, directory);
  const name = options.fileName ?? (options.suffix ? `${extractedName}.${options.suffix}` : extractedName);
  const filePath = joinPathFragments(directory, `${name}.${fileExtension}`);

  return {
    artifactName: options.name ?? extractedName,
    directory: directory,
    fileName: name,
    filePath: filePath,
    project: project,
  };
}
