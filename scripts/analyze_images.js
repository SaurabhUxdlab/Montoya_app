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

async function analyze() {
  console.log('Jimp loaded successfully');
  
  const logo = await Jimp.read('assets/montoyalogo.png');
  console.log('montoyalogo.png:', logo.bitmap.width, 'x', logo.bitmap.height);
  
  const icon = await Jimp.read('assets/app-icon.png');
  console.log('app-icon.png:', icon.bitmap.width, 'x', icon.bitmap.height);
  
  // Check transparency and colors
  let minX = logo.bitmap.width, maxX = 0, minY = logo.bitmap.height, maxY = 0;
  for (let y = 0; y < logo.bitmap.height; y++) {
    for (let x = 0; x < logo.bitmap.width; x++) {
      const idx = (y * logo.bitmap.width + x) * 4;
      const a = logo.bitmap.data[idx + 3];
      const r = logo.bitmap.data[idx];
      const g = logo.bitmap.data[idx + 1];
      const b = logo.bitmap.data[idx + 2];
      // Check if not white or not transparent
      const isNotWhite = (a > 10 && !(r > 245 && g > 245 && b > 245));
      if (isNotWhite) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  console.log('montoyalogo.png non-white/non-transparent bounds:', { minX, maxX, minY, maxY });
}

analyze().catch(err => console.error(err));
