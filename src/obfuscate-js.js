const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

// Base path for the build output
const basePath = path.resolve(__dirname, '../dist/win-unpacked/resources/app/src');

const filesToObfuscate = [
  'preload.js',
  'overlayPreload.js',
  'renderer/renderer.js',
];

const options = {
  rotateStringArray: true,
  stringArray: true,
  stringArrayThreshold: 0.75,
};

filesToObfuscate.forEach((relativePath) => {
  const absolutePath = path.join(basePath, relativePath);
  if (fs.existsSync(absolutePath)) {
    const originalCode = fs.readFileSync(absolutePath, 'utf-8');
    const obfuscatedCode = JavaScriptObfuscator.obfuscate(originalCode, options).getObfuscatedCode();
    fs.writeFileSync(absolutePath, obfuscatedCode, 'utf-8');
    console.log(`Obfuscated: ${absolutePath}`);
  } else {
    console.error(`File not found: ${absolutePath}`);
  }
});
