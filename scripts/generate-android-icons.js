const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Android icon sizes (in pixels) for each density
const iconSizes = {
  'mdpi': 48,
  'hdpi': 72,
  'xhdpi': 96,
  'xxhdpi': 144,
  'xxxhdpi': 192
};

// Safe zone: Android adaptive icons use 66-72% of canvas (108dp canvas)
// This means we need ~20% padding on each side
const SAFE_ZONE_PERCENT = 0.72; // 72% of canvas for the icon

async function generateAndroidIcon(inputPath, outputDir) {
  if (!fs.existsSync(inputPath)) {
    console.error(`Input file not found: ${inputPath}`);
    process.exit(1);
  }

  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`Generating Android icons from: ${inputPath}`);
  console.log(`Output directory: ${outputDir}\n`);

  for (const [density, size] of Object.entries(iconSizes)) {
    try {
      // Calculate icon size (72% of canvas)
      const iconSize = Math.floor(size * SAFE_ZONE_PERCENT);
      
      // Load and resize the icon
      const iconBuffer = await sharp(inputPath)
        .resize(iconSize, iconSize, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
        })
        .toBuffer();

      // Create canvas with padding (centered)
      const padding = size - iconSize;
      const leftPadding = Math.floor(padding / 2);
      const topPadding = Math.floor(padding / 2);

      await sharp({
        create: {
          width: size,
          height: size,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
        }
      })
        .composite([
          {
            input: iconBuffer,
            left: leftPadding,
            top: topPadding
          }
        ])
        .png()
        .toFile(path.join(outputDir, `${density}-icon.png`));

      console.log(`✓ Generated ${density} icon: ${size}x${size}px (icon: ${iconSize}x${iconSize}px with padding)`);
    } catch (error) {
      console.error(`✗ Failed to generate ${density} icon:`, error.message);
    }
  }

  console.log('\n✅ All icons generated successfully!');
}

// Main execution
const inputIcon = path.join(__dirname, '..', 'assets', 'patternLogo.png');
const outputDir = path.join(__dirname, '..', 'resources', 'android', 'icon-generated');

generateAndroidIcon(inputIcon, outputDir)
  .then(() => {
    console.log('\n📱 Copying icons to Android mipmap directories...');
    
    // Copy generated icons to Android mipmap directories
    const androidResPath = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');
    const densities = Object.keys(iconSizes);
    
    densities.forEach(density => {
      const sourceFile = path.join(outputDir, `${density}-icon.png`);
      const mipmapDir = path.join(androidResPath, `mipmap-${density}`);
      
      if (!fs.existsSync(mipmapDir)) {
        fs.mkdirSync(mipmapDir, { recursive: true });
      }

      // Copy to all three icon types
      ['ic_launcher.png', 'ic_launcher_round.png', 'ic_launcher_foreground.png'].forEach(iconName => {
        const destFile = path.join(mipmapDir, iconName);
        if (fs.existsSync(sourceFile)) {
          fs.copyFileSync(sourceFile, destFile);
          console.log(`  ✓ Copied to mipmap-${density}/${iconName}`);
        }
      });
    });

    console.log('\n✅ Icons copied to Android directories!');
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });

