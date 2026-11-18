const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const rootDir = path.resolve(__dirname, '..');
const logoBuffer = fs.readFileSync(path.join(rootDir, 'assets', 'montoyalogo.png'));
const logoPng = PNG.sync.read(logoBuffer);

// Sample colors in emblem
// Red pixel in the M
let redColors = {};
let darkColors = {};

for (let y = 15; y <= 73; y++) {
  for (let x = 29; x <= 87; x++) {
    const idx = (logoPng.width * y + x) << 2;
    const r = logoPng.data[idx];
    const g = logoPng.data[idx + 1];
    const b = logoPng.data[idx + 2];
    const a = logoPng.data[idx + 3];
    if (a > 200) {
      const hex = '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
      if (r > 150 && g < 50 && b < 50) {
        redColors[hex] = (redColors[hex] || 0) + 1;
      } else if (r < 80 && g < 80 && b < 100) {
        darkColors[hex] = (darkColors[hex] || 0) + 1;
      }
    }
  }
}

console.log('Top red colors in montoyalogo.png:', Object.entries(redColors).sort((a,b) => b[1]-a[1]).slice(0, 5));
console.log('Top dark colors in montoyalogo.png:', Object.entries(darkColors).sort((a,b) => b[1]-a[1]).slice(0, 5));
