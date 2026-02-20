const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Desktop icon sizes needed
const windowsIconSizes = [16, 32, 48, 64, 128, 256];
const macIconSizes = [16, 32, 64, 128, 256, 512, 1024];
const linuxIconSize = 512;

async function generateDesktopIcons() {
  const inputPath = path.join(__dirname, '..', 'assets', 'patternLogo.png');
  const assetsDir = path.join(__dirname, '..', 'assets');

  // Check if input file exists
  if (!fs.existsSync(inputPath)) {
    console.error(`❌ Input file not found: ${inputPath}`);
    process.exit(1);
  }

  // Ensure assets directory exists
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  console.log(`📸 Generating desktop icons from: ${inputPath}`);
  console.log(`📁 Output directory: ${assetsDir}\n`);

  try {
    // Generate Windows ICO file
    console.log('🪟 Generating Windows icon...');
    const icoImages = [];
    for (const size of windowsIconSizes) {
      const buffer = await sharp(inputPath)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 } // Transparent background
        })
        .png()
        .toBuffer();
      icoImages.push({ size, buffer });
    }
    
    // For Windows, we'll create a multi-size PNG and save as .ico
    // Note: Sharp doesn't create true ICO format, but Electron accepts PNG with .ico extension
    // For proper ICO, we'll use the largest size (256x256) as the main icon
    const largestIco = icoImages.find(img => img.size === 256);
    if (largestIco) {
      const icoPath = path.join(assetsDir, 'patternLogo.ico');
      fs.writeFileSync(icoPath, largestIco.buffer);
      console.log(`✓ Generated patternLogo.ico (256x256px)`);
    }

    // Generate Mac ICNS file
    console.log('🍎 Generating Mac icon...');
    // ICNS format is complex, so we'll create an .icns file structure
    // For now, we'll create a high-res PNG that can be converted to ICNS
    // Electron Builder will handle the ICNS conversion if needed
    const macIconPath = path.join(assetsDir, 'patternLogo.icns');
    const macIconBuffer = await sharp(inputPath)
      .resize(1024, 1024, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toBuffer();
    
    // For Mac, Electron Builder expects .icns but can work with PNG
    // We'll create a PNG with .icns extension (Electron Builder will convert it)
    // Or create proper ICNS structure - for simplicity, we'll use PNG
    // Note: For production, you may want to use a tool like iconutil on Mac
    fs.writeFileSync(macIconPath, macIconBuffer);
    console.log(`✓ Generated patternLogo.icns (1024x1024px PNG, will be converted by Electron Builder)`);

    // Generate Linux PNG icon (use a different name to avoid overwriting source)
    console.log('🐧 Generating Linux icon...');
    // Note: We'll use patternLogo.png from assets as the source, but for Electron Builder
    // we can reference the same file. The icon will be used as-is for Linux builds.
    // If we need a specific size, we can create patternLogo-linux.png
    const linuxIconPath = path.join(assetsDir, 'patternLogo-linux.png');
    await sharp(inputPath)
      .resize(linuxIconSize, linuxIconSize, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(linuxIconPath);
    console.log(`✓ Generated patternLogo-linux.png (${linuxIconSize}x${linuxIconSize}px)`);
    // Also copy to patternLogo.png if it doesn't exist or if we want to replace it
    // For now, we'll keep the original and use patternLogo-linux.png for builds

    // Also create a copy for Electron main process (icon.ico)
    const electronIconPath = path.join(assetsDir, 'icon.ico');
    if (largestIco) {
      fs.writeFileSync(electronIconPath, largestIco.buffer);
      console.log(`✓ Generated icon.ico for Electron main process`);
    }

    console.log('\n✅ All desktop icons generated successfully!');
    console.log('\n📝 Next steps:');
    console.log('   - Windows: patternLogo.ico');
    console.log('   - Mac: patternLogo.icns (PNG format, Electron Builder will convert)');
    console.log('   - Linux: patternLogo.png');
    console.log('   - Electron: icon.ico');
    
  } catch (error) {
    console.error('❌ Error generating icons:', error);
    process.exit(1);
  }
}

// Run the function
generateDesktopIcons();

