import fs from 'node:fs/promises';
import path from 'path';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

// const input = path.resolve('public/logo.svg');
const input = path.resolve('public/logo.png');
const outputDir = path.resolve('public');

const sizes = [16, 32, 48, 128];

for (const size of sizes) {
  await sharp(input)
    .resize(size, size)
    .png()
    .toFile(path.join(outputDir, `icon${size}.png`));
}

const ico = await pngToIco([
  path.join(outputDir, 'icon16.png'),
  path.join(outputDir, 'icon32.png'),
  path.join(outputDir, 'icon48.png'),
]);

await fs.writeFile(path.join(outputDir, 'favicon.ico'), ico);

console.log('Generated extension icons and favicon.ico');
