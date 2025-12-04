const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Web icon sizes needed
const iconSizes = {
  'favicon-16': 16,
  'favicon-32': 32,
  'icon-192': 192,
  'icon-512': 512
};

async function generateWebIcons() {
  const inputPath = path.join(__dirname, '..', 'assets', 'patternLogo.png');
  const publicDir = path.join(__dirname, '..', 'public');

  // Check if input file exists
  if (!fs.existsSync(inputPath)) {
    console.error(`❌ Input file not found: ${inputPath}`);
    process.exit(1);
  }

  // Ensure public directory exists
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  console.log(`📸 Generating web icons from: ${inputPath}`);
  console.log(`📁 Output directory: ${publicDir}\n`);

  try {
    // Generate PNG icons
    for (const [name, size] of Object.entries(iconSizes)) {
      const outputPath = path.join(publicDir, `${name}.png`);
      
      await sharp(inputPath)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 } // Transparent background
        })
        .png()
        .toFile(outputPath);

      console.log(`✓ Generated ${name}.png: ${size}x${size}px`);
    }

    // Generate favicon.ico (combine 16x16 and 32x32)
    // Create ICO file from the 32x32 PNG (most browsers use 32x32 from ICO)
    const favicon32Path = path.join(publicDir, 'favicon-32.png');
    const faviconPath = path.join(publicDir, 'favicon.ico');
    
    // For ICO, we'll use the 32x32 version
    // Note: sharp doesn't directly support ICO, so we'll copy the 32x32 PNG
    // and rename it. Most modern browsers will accept PNG as favicon.ico
    // For true ICO format, you'd need a different library, but this works for most cases
    if (fs.existsSync(favicon32Path)) {
      // Copy 32x32 PNG as favicon.ico (browsers accept PNG with .ico extension)
      fs.copyFileSync(favicon32Path, faviconPath);
      console.log(`✓ Generated favicon.ico (from 32x32 PNG)`);
    }

    // Also create a proper 16x16 favicon
    const favicon16Path = path.join(publicDir, 'favicon-16.png');
    if (fs.existsSync(favicon16Path)) {
      // Some systems prefer 16x16, so we keep both
      console.log(`✓ favicon-16.png available for fallback`);
    }

    console.log('\n✅ All web icons generated successfully!');
    console.log('\n📝 Next steps:');
    console.log('   - Icons are in the public/ folder');
    console.log('   - HTML and manifest.json have been updated to reference these icons');
    
  } catch (error) {
    console.error('❌ Error generating icons:', error);
    process.exit(1);
  }
}

// Run the function
generateWebIcons();

