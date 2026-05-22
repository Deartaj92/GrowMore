const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

const compsDir = path.join('d:', 'GrowMore', 'src', 'components');
walkDir(compsDir, function(filepath) {
  if (!filepath.endsWith('.tsx')) return;
  let content = fs.readFileSync(filepath, 'utf8');
  let newContent = content;
  
  newContent = newContent.replace(/<PageContainer\s+theme=\{theme\}>/g, '<PageContainer>');
  newContent = newContent.replace(/<FormContainer\s+theme=\{theme\}>/g, '<FormContainer>');
  newContent = newContent.replace(/<MobileCard\s+key=\{([^}]+)\}\s+theme=\{theme\}>/g, '<MobileCard key={$1}>');
  newContent = newContent.replace(/<Card\s+theme=\{theme\}/g, '<Card');
  
  if (path.basename(filepath) === 'DMCManager.tsx') {
    newContent = newContent.replace(/background:\s*\$\{theme === 'dark' \? '#252525' : '#f7faff'\};/g, "background: ${theme.BG === '#252525' ? '#252525' : '#f7faff'};");
    newContent = newContent.replace(/border:\s*1px solid \$\{theme === 'dark' \? '#3a3f4b' : '#b6c2d9'\};/g, "border: 1px solid ${theme.BG === '#252525' ? '#3a3f4b' : '#b6c2d9'};");
    newContent = newContent.replace(/background:\s*\$\{theme === 'dark' \? 'rgba\(74, 108, 247, 0\.18\)' : 'rgba\(74, 108, 247, 0\.15\)'\};/g, "background: ${theme.BG === '#252525' ? 'rgba(74, 108, 247, 0.18)' : 'rgba(74, 108, 247, 0.15)'};");
  }

  if (path.basename(filepath) === 'ExaminationManager.tsx') {
    newContent = newContent.replace(/theme\.palette\?\.mode === 'dark'/g, "theme.BG === '#252525'");
    newContent = newContent.replace(/theme\.palette\.background\.paper/g, "theme.CARD");
    newContent = newContent.replace(/theme\.palette\.primary\.light/g, "theme.ACCENT_DARK");
    newContent = newContent.replace(/theme\.palette\.primary\.main/g, "theme.ACCENT");
    newContent = newContent.replace(/theme\.palette\?\.primary\?\.main/g, "theme.ACCENT");
  }

  if (content !== newContent) {
    fs.writeFileSync(filepath, newContent, 'utf8');
    console.log('Fixed', path.basename(filepath));
  }
});
