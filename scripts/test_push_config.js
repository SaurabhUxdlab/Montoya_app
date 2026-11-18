const fs = require('fs');
const path = require('path');

console.log('====================================================');
console.log('📱 PUSH NOTIFICATION & FIREBASE CONFIG DIAGNOSTIC');
console.log('====================================================\n');

let passed = 0;
let total = 0;

function check(title, condition, extraInfo = '') {
  total++;
  if (condition) {
    console.log(`  ✅ [PASS] ${title}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${title} ${extraInfo ? '-> ' + extraInfo : ''}`);
  }
}

// 1. Check google-services.json in root & android/app
const rootGoogleServicesPath = path.join(__dirname, '..', 'google-services.json');
const androidAppGoogleServicesPath = path.join(__dirname, '..', 'android', 'app', 'google-services.json');

check('Root google-services.json exists', fs.existsSync(rootGoogleServicesPath));
check('android/app/google-services.json exists', fs.existsSync(androidAppGoogleServicesPath));

if (fs.existsSync(rootGoogleServicesPath)) {
  const gsJson = JSON.parse(fs.readFileSync(rootGoogleServicesPath, 'utf8'));
  const packageNames = gsJson.client?.map(c => c.client_info?.android_client_info?.package_name) || [];
  check('google-services.json contains package com.montoya.tenniscoach', packageNames.includes('com.montoya.tenniscoach'), `Found: ${packageNames.join(', ')}`);
}

// 2. Check app.json
const appJsonPath = path.join(__dirname, '..', 'app.json');
if (fs.existsSync(appJsonPath)) {
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  check('app.json android.googleServicesFile is configured', appJson.expo?.android?.googleServicesFile === './google-services.json');
  check('app.json android.package is com.montoya.tenniscoach', appJson.expo?.android?.package === 'com.montoya.tenniscoach');
  const plugins = appJson.expo?.plugins || [];
  const notifPlugin = plugins.find(p => (Array.isArray(p) ? p[0] : p) === 'expo-notifications');
  check('app.json has expo-notifications plugin configured', !!notifPlugin);
}

// 3. Check android/build.gradle
const buildGradlePath = path.join(__dirname, '..', 'android', 'build.gradle');
if (fs.existsSync(buildGradlePath)) {
  const content = fs.readFileSync(buildGradlePath, 'utf8');
  check('android/build.gradle includes com.google.gms:google-services classpath', content.includes('com.google.gms:google-services'));
}

// 4. Check android/app/build.gradle
const appBuildGradlePath = path.join(__dirname, '..', 'android', 'app', 'build.gradle');
if (fs.existsSync(appBuildGradlePath)) {
  const content = fs.readFileSync(appBuildGradlePath, 'utf8');
  check('android/app/build.gradle applies plugin com.google.gms.google-services', content.includes('apply plugin: "com.google.gms.google-services"'));
}

// 5. Check pushNotificationService.ts
const pushServicePath = path.join(__dirname, '..', 'src', 'services', 'pushNotificationService.ts');
if (fs.existsSync(pushServicePath)) {
  const content = fs.readFileSync(pushServicePath, 'utf8');
  check("pushNotificationService does not have custom sound: 'default'", !content.includes("sound: 'default'"));
  check("pushNotificationService registers Android channel", content.includes("setNotificationChannelAsync('default'"));
  check("pushNotificationService handles fallback gracefully", content.includes("getDevicePushTokenAsync") && content.includes("getExpoPushTokenAsync"));
}

console.log('\n====================================================');
console.log(`DIAGNOSTIC SUMMARY: ${passed}/${total} CHECKS PASSED`);
console.log('====================================================\n');

process.exit(passed === total ? 0 : 1);
