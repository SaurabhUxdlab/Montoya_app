const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const rootDir = path.resolve(__dirname, '..');

// 1. Load source app-icon.png and extract the emblem
const appIconBuffer = fs.readFileSync(path.join(rootDir, 'assets', 'app-icon.png'));
const srcPng = PNG.sync.read(appIconBuffer);

console.log('Source app-icon.png size:', srcPng.width, 'x', srcPng.height);

// Find exact emblem bounding box
let minX = srcPng.width, maxX = 0, minY = srcPng.height, maxY = 0;
for (let y = 0; y < srcPng.height; y++) {
  for (let x = 0; x < srcPng.width; x++) {
    const idx = (srcPng.width * y + x) << 2;
    const r = srcPng.data[idx];
    const g = srcPng.data[idx + 1];
    const b = srcPng.data[idx + 2];
    const a = srcPng.data[idx + 3];
    // Check if pixel is foreground (not white background and not transparent)
    if (a > 20 && !(r > 245 && g > 245 && b > 245)) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}

console.log('Detected emblem bounds in source:', { minX, maxX, minY, maxY });
const emblemW = maxX - minX + 1;
const emblemH = maxY - minY + 1;
console.log('Emblem dimension:', emblemW, 'x', emblemH);

// Crop the emblem to an exact sub-image with transparent background where white is replaced with alpha
// Actually, let's keep the emblem's internal white fill or transparency intact
const emblemPng = new PNG({ width: emblemW, height: emblemH });
for (let y = 0; y < emblemH; y++) {
  for (let x = 0; x < emblemW; x++) {
    const srcIdx = (srcPng.width * (minY + y) + (minX + x)) << 2;
    const destIdx = (emblemW * y + x) << 2;
    emblemPng.data[destIdx] = srcPng.data[srcIdx];
    emblemPng.data[destIdx + 1] = srcPng.data[srcIdx + 1];
    emblemPng.data[destIdx + 2] = srcPng.data[srcIdx + 2];
    emblemPng.data[destIdx + 3] = srcPng.data[srcIdx + 3];
  }
}

// Bilinear interpolation resize function
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

// Function to create a padded icon canvas
function createPaddedIcon(size, scaleFactor = 0.60, bgIsWhite = true) {
  const canvas = new PNG({ width: size, height: size });
  
  // Fill background
  for (let i = 0; i < size * size; i++) {
    const idx = i << 2;
    if (bgIsWhite) {
      canvas.data[idx] = 255;
      canvas.data[idx + 1] = 255;
      canvas.data[idx + 2] = 255;
      canvas.data[idx + 3] = 255;
    } else {
      canvas.data[idx] = 0;
      canvas.data[idx + 1] = 0;
      canvas.data[idx + 2] = 0;
      canvas.data[idx + 3] = 0;
    }
  }

  // Calculate scaled emblem size (keep 1:1 aspect ratio)
  const targetEmblemSize = Math.round(size * scaleFactor);
  const resizedEmblem = resizeImage(emblemPng, targetEmblemSize, targetEmblemSize);

  // Optical centering:
  // Center horizontally and vertically
  const offsetX = Math.round((size - targetEmblemSize) / 2);
  const offsetY = Math.round((size - targetEmblemSize) / 2);

  // Composite emblem onto canvas
  for (let y = 0; y < targetEmblemSize; y++) {
    for (let x = 0; x < targetEmblemSize; x++) {
      const srcIdx = (y * targetEmblemSize + x) << 2;
      const destX = offsetX + x;
      const destY = offsetY + y;
      if (destX >= 0 && destX < size && destY >= 0 && destY < size) {
        const destIdx = (destY * size + destX) << 2;
        const alpha = resizedEmblem.data[srcIdx + 3] / 255;
        if (alpha > 0) {
          if (bgIsWhite) {
            canvas.data[destIdx] = Math.round(resizedEmblem.data[srcIdx] * alpha + 255 * (1 - alpha));
            canvas.data[destIdx + 1] = Math.round(resizedEmblem.data[srcIdx + 1] * alpha + 255 * (1 - alpha));
            canvas.data[destIdx + 2] = Math.round(resizedEmblem.data[srcIdx + 2] * alpha + 255 * (1 - alpha));
            canvas.data[destIdx + 3] = 255;
          } else {
            canvas.data[destIdx] = resizedEmblem.data[srcIdx];
            canvas.data[destIdx + 1] = resizedEmblem.data[srcIdx + 1];
            canvas.data[destIdx + 2] = resizedEmblem.data[srcIdx + 2];
            canvas.data[destIdx + 3] = resizedEmblem.data[srcIdx + 3];
          }
        }
      }
    }
  }

  return canvas;
}

// Generate 1024x1024 master app-icon.png (scaleFactor 0.60, perfectly balanced safe zone)
const masterIcon = createPaddedIcon(1024, 0.60, true);
const masterIconBuffer = PNG.sync.write(masterIcon);

// Write to assets/
fs.writeFileSync(path.join(rootDir, 'assets', 'app-icon.png'), masterIconBuffer);
fs.writeFileSync(path.join(rootDir, 'assets', 'icon.png'), masterIconBuffer);
fs.writeFileSync(path.join(rootDir, 'assets', 'adaptive-icon.png'), masterIconBuffer);

// 512x512 for favicon
const faviconIcon = createPaddedIcon(512, 0.60, true);
fs.writeFileSync(path.join(rootDir, 'assets', 'favicon.png'), PNG.sync.write(faviconIcon));
console.log('Generated master assets in /assets');

// Generate Android mipmap densities:
const densities = [
  { name: 'mdpi', legacy: 48, adaptive: 108 },
  { name: 'hdpi', legacy: 72, adaptive: 162 },
  { name: 'xhdpi', legacy: 96, adaptive: 216 },
  { name: 'xxhdpi', legacy: 144, adaptive: 324 },
  { name: 'xxxhdpi', legacy: 192, adaptive: 432 }
];

const resDir = path.join(rootDir, 'android', 'app', 'src', 'main', 'res');

densities.forEach(d => {
  const dirPath = path.join(resDir, `mipmap-${d.name}`);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  // 1. Legacy square icon
  const legacySquare = createPaddedIcon(d.legacy, 0.60, true);
  fs.writeFileSync(path.join(dirPath, 'ic_launcher.png'), PNG.sync.write(legacySquare));

  // 2. Legacy round icon (circular crop on white disc)
  const legacyRound = createPaddedIcon(d.legacy, 0.60, true);
  // Optional: mask corners to transparent circle for ic_launcher_round
  const radius = d.legacy / 2;
  for (let y = 0; y < d.legacy; y++) {
    for (let x = 0; x < d.legacy; x++) {
      const dist = Math.sqrt((x - radius + 0.5) ** 2 + (y - radius + 0.5) ** 2);
      if (dist > radius) {
        const idx = (y * d.legacy + x) << 2;
        legacyRound.data[idx + 3] = 0;
      }
    }
  }
  fs.writeFileSync(path.join(dirPath, 'ic_launcher_round.png'), PNG.sync.write(legacyRound));

  // 3. Adaptive foreground (scaleFactor 0.60 inside 108dp canvas, matching safe zone)
  const adaptiveFg = createPaddedIcon(d.adaptive, 0.60, true);
  fs.writeFileSync(path.join(dirPath, 'ic_launcher_foreground.png'), PNG.sync.write(adaptiveFg));
  
  console.log(`Generated mipmap-${d.name}: legacy (${d.legacy}x${d.legacy}), adaptive (${d.adaptive}x${d.adaptive})`);
});

// Also create a visual preview showing squircle mask and circular mask to verify safe area
function createMockLauncherPreview() {
  const previewSize = 400;
  const preview = new PNG({ width: previewSize * 2 + 40, height: previewSize + 40 });
  // Fill light gray background
  for (let i = 0; i < preview.width * preview.height; i++) {
    const idx = i << 2;
    preview.data[idx] = 240;
    preview.data[idx + 1] = 240;
    preview.data[idx + 2] = 240;
    preview.data[idx + 3] = 255;
  }

  const iconResized = resizeImage(masterIcon, previewSize, previewSize);

  // Left: Squircle mask (similar to Samsung/Xiaomi/Android squircle & iOS)
  const squircleRadius = 80;
  for (let y = 0; y < previewSize; y++) {
    for (let x = 0; x < previewSize; x++) {
      const destX = 20 + x;
      const destY = 20 + y;
      const srcIdx = (y * previewSize + x) << 2;
      const destIdx = (destY * preview.width + destX) << 2;

      // Check squircle rounded corner bounds
      let inside = true;
      const cx = x < squircleRadius ? squircleRadius : (x > previewSize - squircleRadius ? previewSize - squircleRadius : x);
      const cy = y < squircleRadius ? squircleRadius : (y > previewSize - squircleRadius ? previewSize - squircleRadius : y);
      const dist = Math.hypot(x - cx, y - cy);
      if (dist > squircleRadius) {
        inside = false;
      }

      if (inside) {
        preview.data[destIdx] = iconResized.data[srcIdx];
        preview.data[destIdx + 1] = iconResized.data[srcIdx + 1];
        preview.data[destIdx + 2] = iconResized.data[srcIdx + 2];
        preview.data[destIdx + 3] = 255;
      }
    }
  }

  // Right: Circle mask (standard Google Pixel / Android circle launcher)
  const circleRadius = previewSize / 2;
  for (let y = 0; y < previewSize; y++) {
    for (let x = 0; x < previewSize; x++) {
      const destX = 20 + previewSize + 20 + x;
      const destY = 20 + y;
      const srcIdx = (y * previewSize + x) << 2;
      const destIdx = (destY * preview.width + destX) << 2;

      const dist = Math.hypot(x - circleRadius, y - circleRadius);
      if (dist <= circleRadius) {
        preview.data[destIdx] = iconResized.data[srcIdx];
        preview.data[destIdx + 1] = iconResized.data[srcIdx + 1];
        preview.data[destIdx + 2] = iconResized.data[srcIdx + 2];
        preview.data[destIdx + 3] = 255;
      }
    }
  }

  fs.writeFileSync(path.join(rootDir, 'scripts', 'preview_icon.png'), PNG.sync.write(preview));
  console.log('Saved preview to scripts/preview_icon.png');
}

createMockLauncherPreview();

console.log('All icons generated successfully!');
