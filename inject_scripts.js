const fs = require('fs');
const path = require('path');

function getAllHtmlFiles(dirPath, arrayOfFiles) {
  let files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];
  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllHtmlFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      if (file.endsWith('.html')) {
        arrayOfFiles.push(path.join(dirPath, "/", file));
      }
    }
  });
  return arrayOfFiles;
}

const htmlFiles = getAllHtmlFiles('stitch');

htmlFiles.forEach(page => {
  let html = fs.readFileSync(page, 'utf8');

  html = html.replace(/<script src="\.\.\/appState\.js"><\/script>\n?/g, '');
  html = html.replace(/<script src="\.\.\/appLogic\.js"><\/script>\n?/g, '');

  if (html.includes('</body>')) {
    html = html.replace('</body>', '<script src="../appState.js"></script>\n<script src="../appLogic.js"></script>\n</body>');
  }

  fs.writeFileSync(page, html, 'utf8');
});

console.log('Scripts injected into ' + htmlFiles.length + ' files!');
