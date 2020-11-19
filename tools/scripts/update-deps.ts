import * as path from 'path';
import * as fs from 'fs';

const rootDir = path.resolve(path.join(__dirname, '..', '..'));
const rootPackageJsonPath = path.resolve(path.join(rootDir, 'package.json'));

const rootPackageJson = JSON.parse(fs.readFileSync(rootPackageJsonPath, 'utf-8'));

const demoPackagePath = path.resolve(path.join(rootDir, 'apps', 'nativescript-demo-ng', 'package.json'));

const demoPackageJson = JSON.parse(fs.readFileSync(demoPackagePath, 'utf-8'));

function sync(rootDeps, chilDeps) {
  for (const dep of Object.keys(chilDeps)) {
    if (rootDeps[dep]) {
      chilDeps[dep] = rootDeps[dep];
    }
  }
}

sync(rootPackageJson.dependencies, demoPackageJson.dependencies);
sync(rootPackageJson.devDependencies, demoPackageJson.devDependencies);

fs.writeFileSync(demoPackagePath, JSON.stringify(demoPackageJson, undefined, 2));
