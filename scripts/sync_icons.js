const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const rootDir = path.resolve(__dirname, '..');
const sourceIcon = path.join(rootDir, 'assets', 'app-icon.png');

if (!fs.existsSync(sourceIcon)) {
  console.error('Source icon does not exist at:', sourceIcon);
  process.exit(1);
}

const iconBuffer = fs.readFileSync(sourceIcon);
console.log('Read source app-icon.png:', iconBuffer.length, 'bytes');

// 1. Sync assets
const targetAssets = ['icon.png', 'adaptive-icon.png', 'favicon.png'];
targetAssets.forEach(target => {
  const targetPath = path.join(rootDir, 'assets', target);
  fs.writeFileSync(targetPath, iconBuffer);
  console.log('Updated:', targetPath);
});

// Bilinear resize helper
function resizeImage(src, targetW, targetH) {
  const dest = new PNG({ width: targetW, height: targetH });
  const xRatio = src.width / targetW;
  const yRatio = src.height / targetH;

  for (let y = 0; y < targetH; y++) {
    for (let x = 0; x < targetW; x++) {
      const srcX = x * xRatio;
      const srcY = y * yRatio;
      const xFloor = Math.floor(srcX);
      const yFloor = Math.floor(srcY);
      const xCeil = Math.min(src.width - 1, Math.ceil(srcX));
      const yCeil = Math.min(src.height - 1, Math.ceil(srcY));
      const xWeight = srcX - xFloor;
      const yWeight = srcY - yFloor;

      const idxTL = (yFloor * src.width + xFloor) << 2;
      const idxTR = (yFloor * src.width + xCeil) << 2;
      const idxBL = (yCeil * src.width + xFloor) << 2;
      const idxBR = (yCeil * src.width + xCeil) << 2;
      const destIdx = (y * targetW + x) << 2;

      for (let c = 0; c < 4; c++) {
        const top = src.data[idxTL + c] * (1 - xWeight) + src.data[idxTR + c] * xWeight;
        const bottom = src.data[idxBL + c] * (1 - xWeight) + src.data[idxBR + c] * xWeight;
        dest.data[destIdx + c] = Math.round(top * (1 - yWeight) + bottom * yWeight);
      }
    }
  }
  return dest;
}

const srcPng = PNG.sync.read(iconBuffer);

// 2. Sync Android mipmap folders
const resDir = path.join(rootDir, 'android', 'app', 'src', 'main', 'res');
const densities = [
  { name: 'mdpi', legacy: 48, adaptive: 108 },
  { name: 'hdpi', legacy: 72, adaptive: 162 },
  { name: 'xhdpi', legacy: 96, adaptive: 216 },
  { name: 'xxhdpi', legacy: 144, adaptive: 324 },
  { name: 'xxxhdpi', legacy: 192, adaptive: 432 }
];

densities.forEach(d => {
  const dirPath = path.join(resDir, `mipmap-${d.name}`);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  // Remove old webp files
  const webpFiles = ['ic_launcher.webp', 'ic_launcher_foreground.webp', 'ic_launcher_round.webp'];
  webpFiles.forEach(f => {
    const filePath = path.join(dirPath, f);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('Removed old webp:', filePath);
    }
  });

  // 1. Legacy square
  const legacyPng = resizeImage(srcPng, d.legacy, d.legacy);
  fs.writeFileSync(path.join(dirPath, 'ic_launcher.png'), PNG.sync.write(legacyPng));

  // 2. Legacy round
  const roundPng = resizeImage(srcPng, d.legacy, d.legacy);
  const radius = d.legacy / 2;
  for (let y = 0; y < d.legacy; y++) {
    for (let x = 0; x < d.legacy; x++) {
      const dist = Math.sqrt((x - radius + 0.5) ** 2 + (y - radius + 0.5) ** 2);
      if (dist > radius) {
        const idx = (y * d.legacy + x) << 2;
        roundPng.data[idx + 3] = 0;
      }
    }
  }
  fs.writeFileSync(path.join(dirPath, 'ic_launcher_round.png'), PNG.sync.write(roundPng));

  // 3. Adaptive foreground (108dp canvas)
  const adaptivePng = resizeImage(srcPng, d.adaptive, d.adaptive);
  fs.writeFileSync(path.join(dirPath, 'ic_launcher_foreground.png'), PNG.sync.write(adaptivePng));
  console.log(`Synchronized mipmap-${d.name}`);
});

console.log('All icons synchronized successfully!');

