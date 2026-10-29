import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type PackageJson = {
  version?: string;
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const packagePath = path.join(root, 'package.json');
const versionPath = path.join(root, 'version.txt');

function parseVersion(value: string, source: string): [number, number, number] {
  const normalized = value.trim();
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(normalized);
  if (!match) {
    throw new Error(`${source} must be major.minor.patch, got ${JSON.stringify(normalized)}`);
  }
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function compareVersions(a: [number, number, number], b: [number, number, number]): number {
  for (let i = 0; i < 3; i += 1) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

const pkg = JSON.parse(readFileSync(packagePath, 'utf8')) as PackageJson;
const packageVersion = parseVersion(pkg.version || '0.0.0', 'package.json version');
const localVersion = existsSync(versionPath)
  ? parseVersion(readFileSync(versionPath, 'utf8'), 'version.txt')
  : packageVersion;

const current = compareVersions(localVersion, packageVersion) >= 0 ? localVersion : packageVersion;
const next: [number, number, number] = [current[0], current[1], current[2] + 1];
const nextVersion = `${next[0]}.${next[1]}.${next[2]}`;

writeFileSync(versionPath, `${nextVersion}\n`, 'utf8');
pkg.version = nextVersion;
writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');

console.log(`Bumped extension version to ${nextVersion}`);
