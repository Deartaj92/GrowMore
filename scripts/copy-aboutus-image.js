const fs = require('fs');
const path = require('path');

// Copy aboutus.png to build directory
function copyAboutUsImage() {
  const sourcePath = path.join(__dirname, '..', 'public', 'aboutus.png');
  const buildPath = path.join(__dirname, '..', 'build', 'aboutus.png');
  const buildDir = path.join(__dirname, '..', 'build');
  
  // Ensure build directory exists
  if (!fs.existsSync(buildDir)) {
    console.log('Build directory does not exist');
    return;
  }
  
  // Copy the file
  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, buildPath);
    console.log('✅ Copied aboutus.png to build directory');
  } else {
    console.log('❌ aboutus.png not found in public directory');
  }
}

// Run the function
copyAboutUsImage();
