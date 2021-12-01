const ngPackage = require('ng-packagr');
const path = require('path');
const fs = require('fs-extra');

const rootDir = path.resolve(path.join(__dirname, '..', '..'));
const nxConfigPath = path.resolve(path.join(rootDir, 'nx.json'));
const nxConfig = JSON.parse(fs.readFileSync(nxConfigPath));
const npmScope = nxConfig.npmScope;

const cmdArgs = process.argv.slice(2);
const packageName = cmdArgs[0];
const publish = cmdArgs[1] === 'publish';

console.log(`Building ${npmScope}/${packageName}...${publish ? 'and publishing.' : ''}`);

// build angular package
function buildAngular() {
  ngPackage
    .ngPackagr()
    .forProject(path.join('packages', packageName, 'ng-package.json'))
    .withTsConfig(path.join('packages', packageName, 'tsconfig.angular.json'))
    .build()
    .then(() => {
      copyAngularDist();
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

// copy angular ng-packagr output to dist/packages/{name}
function copyAngularDist() {
  fs.copy(path.join('packages', packageName, 'dist'), path.join('dist', 'packages', packageName))
    .then(() => {
      console.log(`${packageName} angular built successfully.`);
      finishPreparation();
    })
    .catch((err) => console.error(err));
}

function finishPreparation() {
  fs.copy(path.join('tools', 'assets', 'publishing'), path.join('dist', 'packages', packageName))
    .then(() => console.log(`${npmScope}/${packageName} ready to publish.`))
    .catch((err) => console.error(err));
}

buildAngular();
