const fs = require('fs');
const path = require('path');

// Source: node_modules/tinymce
const sourceRoot = path.join(__dirname, '..', 'node_modules', 'tinymce');
// Destination: public/tinymce
const destRoot = path.join(__dirname, '..', 'public', 'tinymce');

const targets = ['skins', 'icons', 'themes', 'models'];

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();

  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    if (!fs.existsSync(path.dirname(dest))) {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
    }
    fs.copyFileSync(src, dest);
  }
}

console.log('Copying TinyMCE assets to public folder...');

try {
  targets.forEach(target => {
    const srcPath = path.join(sourceRoot, target);
    const destPath = path.join(destRoot, target);
    
    if (fs.existsSync(srcPath)) {
        copyRecursiveSync(srcPath, destPath);
        console.log(`✓ Copied ${target}`);
    } else {
        console.warn(`! Source not found: ${srcPath}`);
    }
  });
  console.log('✅ TinyMCE assets copied successfully.');
} catch (err) {
  console.error('❌ Error copying TinyMCE assets:', err);
  process.exit(1);
}
