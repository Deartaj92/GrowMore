const toIco = require('to-ico');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function fixIcon() {
  const inputPng = path.join(__dirname, '..', 'assets', 'patternLogo.png');
  const outputIco = path.join(__dirname, '..', 'assets', 'patternLogo.ico');

  console.log('🔄 Converting PNG to ICO...');
  console.log(`Input: ${inputPng}`);
  console.log(`Output: ${outputIco}`);

  try {
    // Read the PNG file as a buffer
    const pngBuffer = fs.readFileSync(inputPng);
    
    // Convert PNG to ICO format with multiple sizes (16, 32, 48, 64, 128, 256)
    // Electron-builder prefers multiple sizes in the ICO file
    const sizes = [16, 32, 48, 64, 128, 256];
    const buffers = await Promise.all(
      sizes.map(size =>
        sharp(pngBuffer)
          .resize(size, size, {
            fit: 'contain',
            background: { r: 255, g: 255, b: 255, alpha: 0 }
          })
          .png()
          .toBuffer()
      )
    );

    // Convert to ICO format
    const icoBuffer = await toIco(buffers);

    // Write the ICO file
    fs.writeFileSync(outputIco, icoBuffer);

    console.log('✅ Successfully converted PNG to ICO!');
    console.log(`✅ ICO file created with sizes: ${sizes.join(', ')}px`);
  } catch (error) {
    console.error('❌ Error converting icon:', error);
    process.exit(1);
  }
}

// Run the function
fixIcon();

