#!/usr/bin/env node
/**
 * Generate PNG icons from SVG favicon for PWA support
 */
import sharp from 'sharp';
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const publicDir = join(__dirname, '..', 'public');

// Icon sizes for PWA
const sizes = [192, 512];

async function generateIcons() {
  const svgPath = join(publicDir, 'favicon.svg');
  const svgBuffer = readFileSync(svgPath);

  console.log('Generating PNG icons from favicon.svg...');

  for (const size of sizes) {
    const outputPath = join(publicDir, `icon-${size}.png`);
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`  Created: icon-${size}.png`);
  }

  // Also create apple-touch-icon (180x180)
  const appleTouchIconPath = join(publicDir, 'apple-touch-icon.png');
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(appleTouchIconPath);
  console.log('  Created: apple-touch-icon.png');

  console.log('Done!');
}

generateIcons().catch(console.error);
