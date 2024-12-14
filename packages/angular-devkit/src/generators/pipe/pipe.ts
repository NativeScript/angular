import type { Tree } from '@nx/devkit';
import { convertNxGenerator, formatFiles, generateFiles, joinPathFragments, names } from '@nx/devkit';
import { addToNgModule, findModule } from '../utils';
import { normalizeOptions } from './lib';
import type { Schema } from './schema';

export async function pipeGenerator(tree: Tree, rawOptions: Schema) {
  const options = await normalizeOptions(tree, rawOptions);

  const pipeNames = names(options.name);

  generateFiles(tree, joinPathFragments(__dirname, 'files'), options.directory, {
    symbolName: options.symbolName,
    fileName: options.fileName,
    selector: pipeNames.propertyName,
    standalone: options.standalone,
    tpl: '',
  });

  if (options.skipTests) {
    const pathToSpecFile = joinPathFragments(options.directory, `${options.fileName}.spec.ts`);

    tree.delete(pathToSpecFile);
  }

  if (!options.skipImport && !options.standalone) {
    const modulePath = findModule(tree, options.directory, options.module);
    addToNgModule(tree, options.directory, modulePath, options.name, options.symbolName, options.fileName, 'declarations', true, options.export);
  }

  if (!options.skipFormat) {
    await formatFiles(tree);
  }
}

export default pipeGenerator;

export const pipeSchematic = convertNxGenerator(pipeGenerator);
