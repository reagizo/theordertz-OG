import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const baseDir = 'android/app/src/main/res';

// Icon sizes for each density
const iconDensities = [
  { dir: 'mipmap-mdpi', size: 48 },
  { dir: 'mipmap-hdpi', size: 72 },
  { dir: 'mipmap-xhdpi', size: 96 },
  { dir: 'mipmap-xxhdpi', size: 144 },
  { dir: 'mipmap-xxxhdpi', size: 192 },
];

// Splash sizes for portrait
const splashPortraitDensities = [
  { dir: 'drawable-port-mdpi', width: 320, height: 470 },
  { dir: 'drawable-port-hdpi', width: 480, height: 640 },
  { dir: 'drawable-port-xhdpi', width: 720, height: 960 },
  { dir: 'drawable-port-xxhdpi', width: 960, height: 1280 },
  { dir: 'drawable-port-xxxhdpi', width: 1280, height: 1920 },
];

// Splash sizes for landscape
const splashLandscapeDensities = [
  { dir: 'drawable-land-mdpi', width: 470, height: 320 },
  { dir: 'drawable-land-hdpi', width: 640, height: 480 },
  { dir: 'drawable-land-xhdpi', width: 960, height: 720 },
  { dir: 'drawable-land-xxhdpi', width: 1280, height: 960 },
  { dir: 'drawable-land-xxxhdpi', width: 1920, height: 1280 },
];

// Default drawable splash
const defaultSplash = { dir: 'drawable', width: 960, height: 1280 };

async function generateIcon(size) {
  return sharp('assets/icon.png')
    .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toBuffer();
}

async function generateSplash(width, height) {
  const logoBuffer = await sharp('assets/icon.png')
    .resize(Math.floor(width * 0.6), Math.floor(height * 0.6), { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toBuffer();
  
  const logo = sharp(logoBuffer);
  const { width: logoW, height: logoH } = await logo.metadata();
  
  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
  .composite([{
    input: logoBuffer,
    left: Math.floor((width - logoW) / 2),
    top: Math.floor((height - logoH) / 2)
  }])
  .png()
  .toBuffer();
}

// Generate icons
for (const density of iconDensities) {
  const dirPath = path.join(baseDir, density.dir);
  fs.mkdirSync(dirPath, { recursive: true });
  
  const iconBuffer = await generateIcon(density.size);
  fs.writeFileSync(path.join(dirPath, 'ic_launcher.png'), iconBuffer);
  fs.writeFileSync(path.join(dirPath, 'ic_launcher_round.png'), iconBuffer);
  fs.writeFileSync(path.join(dirPath, 'ic_launcher_foreground.png'), iconBuffer);
  
  console.log(`✓ ${density.dir}/ic_launcher.png (${density.size}x${density.size})`);
}

// Generate portrait splash screens
for (const density of splashPortraitDensities) {
  const dirPath = path.join(baseDir, density.dir);
  fs.mkdirSync(dirPath, { recursive: true });
  
  const splashBuffer = await generateSplash(density.width, density.height);
  fs.writeFileSync(path.join(dirPath, 'splash.png'), splashBuffer);
  
  console.log(`✓ ${density.dir}/splash.png (${density.width}x${density.height})`);
}

// Generate landscape splash screens
for (const density of splashLandscapeDensities) {
  const dirPath = path.join(baseDir, density.dir);
  fs.mkdirSync(dirPath, { recursive: true });
  
  const splashBuffer = await generateSplash(density.width, density.height);
  fs.writeFileSync(path.join(dirPath, 'splash.png'), splashBuffer);
  
  console.log(`✓ ${density.dir}/splash.png (${density.width}x${density.height})`);
}

// Generate default drawable splash
{
  const dirPath = path.join(baseDir, defaultSplash.dir);
  fs.mkdirSync(dirPath, { recursive: true });
  
  const splashBuffer = await generateSplash(defaultSplash.width, defaultSplash.height);
  fs.writeFileSync(path.join(dirPath, 'splash.png'), splashBuffer);
  
  console.log(`✓ ${defaultSplash.dir}/splash.png (${defaultSplash.width}x${defaultSplash.height})`);
}

console.log('\nAll Android assets generated successfully!');
