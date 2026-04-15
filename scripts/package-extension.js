import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const distPath = path.resolve('dist');
const manifestPath = path.join(distPath, 'manifest.json');

// 1. Read manifest
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
const version = manifest.version;

if (!version) {
  throw new Error('Version not found in manifest.json');
}

// 2. Ensure output directory exists
const outputDir = path.resolve('chrome-package');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

// 3. Zip dist contents
const zipName = `${version}.zip`;
const zipPath = path.join(outputDir, zipName);

// remove existing zip if exists
if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
}

// zip contents, not folder itself
execSync(`cd dist && zip -r ../chrome-package/${zipName} .`, {
  stdio: 'inherit',
});

console.log(`✅ Extension packaged: chrome-package/${zipName}`);
