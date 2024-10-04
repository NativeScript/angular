import type { Tree } from '@nx/devkit';
import { convertNxGenerator, formatFiles, generateFiles, joinPathFragments } from '@nx/devkit';
import { addToNgModule, findModule } from '../utils';
import { normalizeOptions } from './lib';
import type { Schema } from './schema';

export async function directiveGenerator(tree: Tree, schema: Schema) {
  const options = await normalizeOptions(tree, schema);

  generateFiles(tree, joinPathFragments(__dirname, 'files'), options.directory, {
    selector: options.selector,
    symbolName: options.symbolName,
    fileName: options.fileName,
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

export default directiveGenerator;

export const directiveSchematic = convertNxGenerator(directiveGenerator);
