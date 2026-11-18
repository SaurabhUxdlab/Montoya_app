const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const rootDir = path.resolve(__dirname, '..');
const logoBuffer = fs.readFileSync(path.join(rootDir, 'assets', 'montoyalogo.png'));
const logoPng = PNG.sync.read(logoBuffer);

console.log('montoyalogo.png:', logoPng.width, 'x', logoPng.height);

// Find non-transparent bounding box for emblem (on the left side)
// The emblem is separated from "Montoya" text.
// Let's find columns where non-transparent pixels exist.
const colNonTransparentCount = new Array(logoPng.width).fill(0);
let minX = logoPng.width, maxX = 0, minY = logoPng.height, maxY = 0;

for (let y = 0; y < logoPng.height; y++) {
  for (let x = 0; x < logoPng.width; x++) {
    const idx = (logoPng.width * y + x) << 2;
    const alpha = logoPng.data[idx + 3];
    if (alpha > 10) {
      colNonTransparentCount[x]++;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}

console.log('Overall bounds in montoyalogo.png:', { minX, maxX, minY, maxY });

// Let's find the gap between the emblem circle and the text
let emblemMaxX = 0;
for (let x = minX; x < logoPng.width; x++) {
  if (colNonTransparentCount[x] === 0 && x > minX + 50) {
    emblemMaxX = x;
    break;
  }
}

console.log('Emblem X range:', minX, 'to', emblemMaxX);

// Let's find emblem Y range
let emblemMinY = logoPng.height, emblemMaxY = 0;
for (let y = 0; y < logoPng.height; y++) {
  for (let x = minX; x < emblemMaxX; x++) {
    const idx = (logoPng.width * y + x) << 2;
    const alpha = logoPng.data[idx + 3];
    if (alpha > 10) {
      if (y < emblemMinY) emblemMinY = y;
      if (y > emblemMaxY) emblemMaxY = y;
    }
  }
}

console.log('Emblem exact bounds:', {
  x: minX,
  y: emblemMinY,
  width: emblemMaxX - minX,
  height: emblemMaxY - emblemMinY + 1
});

// Also inspect existing app-icon.png
const appIconBuffer = fs.readFileSync(path.join(rootDir, 'assets', 'app-icon.png'));
const appIconPng = PNG.sync.read(appIconBuffer);
console.log('app-icon.png:', appIconPng.width, 'x', appIconPng.height);

let aMinX = appIconPng.width, aMaxX = 0, aMinY = appIconPng.height, aMaxY = 0;
for (let y = 0; y < appIconPng.height; y++) {
  for (let x = 0; x < appIconPng.width; x++) {
    const idx = (appIconPng.width * y + x) << 2;
    const alpha = appIconPng.data[idx + 3];
    const r = appIconPng.data[idx];
    const g = appIconPng.data[idx + 1];
    const b = appIconPng.data[idx + 2];
    const isVisible = alpha > 10 && !(r > 250 && g > 250 && b > 250);
    if (isVisible) {
      if (x < aMinX) aMinX = x;
      if (x > aMaxX) aMaxX = x;
      if (y < aMinY) aMinY = y;
      if (y > aMaxY) aMaxY = y;
    }
  }
}
console.log('app-icon.png content bounds:', { minX: aMinX, maxX: aMaxX, minY: aMinY, maxY: aMaxY });
