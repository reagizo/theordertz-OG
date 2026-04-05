import sharp from 'sharp';

// Generate icon: 1024x1024 transparent
await sharp('public/logo.svg')
  .resize(1024, 1024, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
  .png()
  .toFile('assets/icon.png');

console.log('Created assets/icon.png');

// Generate splash: 2732x2732 with white background, logo centered
await sharp('public/logo.svg')
  .resize(1800, 1800, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
  .png()
  .toBuffer()
  .then(async (buffer) => {
    const logo = sharp(buffer);
    const { width, height } = await logo.metadata();
    
    await sharp({
      create: {
        width: 2732,
        height: 2732,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    })
    .composite([{
      input: buffer,
      left: Math.floor((2732 - width) / 2),
      top: Math.floor((2732 - height) / 2)
    }])
    .png()
    .toFile('assets/splash.png');
    
    console.log('Created assets/splash.png');
  });

console.log('All source images generated!');
