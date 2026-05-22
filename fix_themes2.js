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
  
  newContent = newContent.replace(/<([A-Z][a-zA-Z0-9]*)([^>]*)theme=\{theme\}([^>]*)>/g, function(match, p1, p2, p3) {
    if (p1 === 'ThemeProvider' || p1 === 'CustomThemeProvider' || p1 === 'MuiThemeProvider') {
      return match;
    }
    return '<' + p1 + p2 + p3 + '>';
  });
  
  newContent = newContent.replace(/<([a-z][a-zA-Z0-9]*)([^>]*)theme=\{theme\}([^>]*)>/g, function(match, p1, p2, p3) {
    return '<' + p1 + p2 + p3 + '>';
  });

  if (content !== newContent) {
    fs.writeFileSync(filepath, newContent, 'utf8');
    console.log('Fixed theme={theme} in', path.basename(filepath));
  }
});
