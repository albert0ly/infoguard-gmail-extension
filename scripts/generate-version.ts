import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type PackageJson = {
  version?: string;
};

type ManifestJson = {
  version?: string;
  [key: string]: unknown;
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const packageJsonPath = path.join(root, 'package.json');
const manifestPath = path.join(root, 'public', 'manifest.json');
const versionPath = path.join(root, 'version.txt');
const outputPath = path.join(root, 'src', 'shared', 'generated-version.ts');

const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as PackageJson;
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as ManifestJson;
const version = (pkg.version || '0.0.0').trim();
const buildId = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

const output =
  '/** Generated from package.json by scripts/generate-version.ts. Do not edit. */\n' +
  `export const EXTENSION_VERSION = ${JSON.stringify(version)};\n` +
  `export const EXTENSION_BUILD_ID = ${JSON.stringify(buildId)};\n`;

writeFileSync(outputPath, output, 'utf8');

if (manifest.version !== version) {
  manifest.version = version;
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

if (!existsSync(versionPath)) {
  writeFileSync(versionPath, `${version}\n`, 'utf8');
}
console.log(`Generated extension version ${version} (${buildId})`);
