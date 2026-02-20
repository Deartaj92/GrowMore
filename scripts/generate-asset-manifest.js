const fs = require('fs');
const path = require('path');

// Function to generate asset-manifest.json
function generateAssetManifest() {
  const buildDir = path.join(__dirname, '..', 'build');
  const staticDir = path.join(buildDir, 'static');
  
  if (!fs.existsSync(buildDir)) {
    console.log('Build directory does not exist');
    return;
  }
  
  // Find all files in the build directory
  const files = [];
  
  function findFiles(dir, basePath = '') {
    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const relativePath = path.join(basePath, item);
      
      if (fs.statSync(fullPath).isDirectory()) {
        findFiles(fullPath, relativePath);
      } else {
        files.push(relativePath.replace(/\\/g, '/'));
      }
    });
  }
  
  findFiles(buildDir);
  
  // Generate asset manifest
  const assetManifest = {
    files: {
      'main.css': files.find(f => f.includes('main.') && f.endsWith('.css')) || 'static/css/main.css',
      'main.js': files.find(f => f.includes('main.') && f.endsWith('.js')) || 'static/js/main.js',
      'main.js.map': files.find(f => f.includes('main.') && f.endsWith('.js.map')) || 'static/js/main.js.map'
    },
    entrypoints: [
      'static/js/main.js'
    ]
  };
  
  // Add chunk files
  const chunkFiles = files.filter(f => f.includes('chunk.') && f.endsWith('.js'));
  chunkFiles.forEach(chunk => {
    const key = chunk.split('/').pop();
    assetManifest.files[key] = chunk;
  });
  
  // Write the manifest file
  const manifestPath = path.join(buildDir, 'asset-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(assetManifest, null, 2));
  
  console.log('Generated asset-manifest.json');
  console.log('Files found:', files.length);
}

// Run the function
generateAssetManifest();
