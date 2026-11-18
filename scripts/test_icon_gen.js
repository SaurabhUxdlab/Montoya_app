let Jimp;
try {
  Jimp = require('jimp-compact');
} catch (e) {
  try {
    Jimp = require('@expo/image-utils/node_modules/jimp-compact');
  } catch (e2) {
    Jimp = require('jimp');
  }
}
const path = require('path');
const fs = require('fs');

async function testGen() {
  const rootDir = path.resolve(__dirname, '..');
  const sourceIconPath = path.join(rootDir, 'assets', 'app-icon.png');
  const src = await Jimp.read(sourceIconPath);
  
  console.log('Source app-icon.png:', src.bitmap.width, 'x', src.bitmap.height);
  
  // Find non-white / non-transparent bounding box in app-icon.png
  let minX = src.bitmap.width, maxX = 0, minY = src.bitmap.height, maxY = 0;
  for (let y = 0; y < src.bitmap.height; y++) {
    for (let x = 0; x < src.bitmap.width; x++) {
      const idx = (y * src.bitmap.width + x) * 4;
      const r = src.bitmap.data[idx];
      const g = src.bitmap.data[idx + 1];
      const b = src.bitmap.data[idx + 2];
      const a = src.bitmap.data[idx + 3];
      
      const isContent = a > 20 && !(r > 245 && g > 245 && b > 245);
      if (isContent) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  
  console.log('Emblem exact bounding box in app-icon.png:', {
    minX, maxX, minY, maxY,
    width: maxX - minX + 1,
    height: maxY - minY + 1
  });
  
  // Also check montoyalogo.png emblem
  const logoPath = path.join(rootDir, 'assets', 'montoyalogo.png');
  const logo = await Jimp.read(logoPath);
  console.log('montoyalogo.png dimensions:', logo.bitmap.width, 'x', logo.bitmap.height);
  
  let lMinX = logo.bitmap.width, lMaxX = 0, lMinY = logo.bitmap.height, lMaxY = 0;
  // Emblem is the circular mark on the left (X roughly 0 to 100)
  for (let y = 0; y < logo.bitmap.height; y++) {
    for (let x = 0; x < 120; x++) {
      const idx = (y * logo.bitmap.width + x) * 4;
      const r = logo.bitmap.data[idx];
      const g = logo.bitmap.data[idx + 1];
      const b = logo.bitmap.data[idx + 2];
      const a = logo.bitmap.data[idx + 3];
      
      const isContent = a > 20 && !(r > 245 && g > 245 && b > 245);
      if (isContent) {
        if (x < lMinX) lMinX = x;
        if (x > lMaxX) lMaxX = x;
        if (y < lMinY) lMinY = y;
        if (y > lMaxY) lMaxY = y;
      }
    }
  }
  
  console.log('Emblem exact bounding box in montoyalogo.png:', {
    lMinX, lMaxX, lMinY, lMaxY,
    width: lMaxX - lMinX + 1,
    height: lMaxY - lMinY + 1
  });
}

testGen().catch(err => console.error(err));
