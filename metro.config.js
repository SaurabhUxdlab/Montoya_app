const { getDefaultConfig } = require('expo/metro-config');
const fs = require('fs');
const path = require('path');

// Automatically sync app icons to Android mipmaps and assets
try {
  const sourceIcon = path.join(__dirname, 'assets', 'app-icon.png');
  if (fs.existsSync(sourceIcon)) {
    const iconBuf = fs.readFileSync(sourceIcon);
    
    // 1. Sync assets
    ['icon.png', 'adaptive-icon.png', 'favicon.png'].forEach(f => {
      const p = path.join(__dirname, 'assets', f);
      try { fs.writeFileSync(p, iconBuf); } catch (e) {}
    });

    // 2. Sync android mipmaps
    const resDir = path.join(__dirname, 'android', 'app', 'src', 'main', 'res');
    if (fs.existsSync(resDir)) {
      const densities = ['mipmap-mdpi', 'mipmap-hdpi', 'mipmap-xhdpi', 'mipmap-xxhdpi', 'mipmap-xxxhdpi'];
      densities.forEach(d => {
        const dPath = path.join(resDir, d);
        if (!fs.existsSync(dPath)) {
          fs.mkdirSync(dPath, { recursive: true });
        }
        // Remove legacy pink webp files
        ['ic_launcher.webp', 'ic_launcher_foreground.webp', 'ic_launcher_round.webp'].forEach(w => {
          const wp = path.join(dPath, w);
          if (fs.existsSync(wp)) {
            try { fs.unlinkSync(wp); } catch (e) {}
          }
        });
        // Write new png icons
        ['ic_launcher.png', 'ic_launcher_foreground.png', 'ic_launcher_round.png'].forEach(p => {
          const pp = path.join(dPath, p);
          try { fs.writeFileSync(pp, iconBuf); } catch (e) {}
        });
      });
    }
  }
} catch (err) {
  console.warn('[Metro] Icon sync warning:', err.message);
}

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Support .cjs files required by Firebase Modular SDK
if (!config.resolver.sourceExts.includes('cjs')) {
  config.resolver.sourceExts.push('cjs');
}

// Disable package exports to prevent dual-instance loading of @firebase/app in Metro
config.resolver.unstable_enablePackageExports = false;

module.exports = config;


