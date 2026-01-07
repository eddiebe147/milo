#!/usr/bin/env node
/**
 * Generate MILO app icon in all required sizes for macOS .icns
 *
 * Creates the iconset folder structure required by iconutil:
 * - icon_16x16.png, icon_16x16@2x.png
 * - icon_32x32.png, icon_32x32@2x.png
 * - icon_128x128.png, icon_128x128@2x.png
 * - icon_256x256.png, icon_256x256@2x.png
 * - icon_512x512.png, icon_512x512@2x.png
 */

import sharp from 'sharp';
import { execFileSync } from 'child_process';
import { mkdirSync, rmSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const resourcesDir = join(projectRoot, 'resources');
const iconsetDir = join(resourcesDir, 'icon.iconset');
const sourcePath = join(resourcesDir, 'icon-source.png'); // Waveform gauge PNG
const icnsPath = join(resourcesDir, 'icon.icns');

// Icon sizes needed for macOS .icns
const sizes = [
  { name: 'icon_16x16.png', size: 16 },
  { name: 'icon_16x16@2x.png', size: 32 },
  { name: 'icon_32x32.png', size: 32 },
  { name: 'icon_32x32@2x.png', size: 64 },
  { name: 'icon_128x128.png', size: 128 },
  { name: 'icon_128x128@2x.png', size: 256 },
  { name: 'icon_256x256.png', size: 256 },
  { name: 'icon_256x256@2x.png', size: 512 },
  { name: 'icon_512x512.png', size: 512 },
  { name: 'icon_512x512@2x.png', size: 1024 },
];

async function generateIcons() {
  console.log('🎨 Generating MILO app icons...\n');

  // Clean up existing iconset
  if (existsSync(iconsetDir)) {
    rmSync(iconsetDir, { recursive: true });
  }
  mkdirSync(iconsetDir, { recursive: true });

  // Generate each size from PNG source
  for (const { name, size } of sizes) {
    const outputPath = join(iconsetDir, name);

    await sharp(sourcePath)
      .resize(size, size, {
        fit: 'cover',
        kernel: sharp.kernel.lanczos3
      })
      .png()
      .toFile(outputPath);

    console.log(`  ✓ ${name} (${size}x${size})`);
  }

  console.log('\n📦 Creating .icns file...');

  // Use iconutil to create .icns (using execFileSync for security)
  try {
    execFileSync('iconutil', ['-c', 'icns', iconsetDir, '-o', icnsPath], {
      stdio: 'inherit'
    });
    console.log(`  ✓ Created ${icnsPath}\n`);
  } catch (error) {
    console.error('  ✗ Failed to create .icns:', error.message);
    process.exit(1);
  }

  console.log('✅ Icon generation complete!');
  console.log(`   Output: resources/icon.icns`);
}

generateIcons().catch(console.error);
