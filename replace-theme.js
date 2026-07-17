const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('./src', function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Borders
    content = content.replace(/border-white\/\d+/g, 'border-border');
    
    // Backgrounds
    content = content.replace(/bg-white\/\d+/g, 'bg-muted');
    content = content.replace(/bg-white\/\[.*?\]/g, 'bg-muted');
    content = content.replace(/bg-background\/[0-9]+/g, 'bg-background/80');

    // Text
    content = content.replace(/text-white/g, 'text-foreground');
    content = content.replace(/dark:text-foreground/g, 'dark:text-white');

    // Fix buttons that were just changed to text-foreground
    content = content.replace(/(bg-violet-[0-9]+[^"]*)text-foreground/g, 'bg-primary hover:bg-primary/90$1text-primary-foreground');
    content = content.replace(/(bg-indigo-[0-9]+[^"]*)text-foreground/g, 'bg-primary hover:bg-primary/90$1text-primary-foreground');
    content = content.replace(/(bg-emerald-[0-9]+[^"]*)text-foreground/g, '$1text-white');
    content = content.replace(/(bg-rose-[0-9]+[^"]*)text-foreground/g, '$1text-white');
    content = content.replace(/(bg-primary[^"]*)text-foreground/g, '$1text-primary-foreground');

    // Remove any text-violet-400 / text-violet-300 and convert to text-primary
    content = content.replace(/text-violet-400/g, 'text-primary');
    content = content.replace(/text-violet-300/g, 'text-primary');

    // Replace gradient background colors
    content = content.replace(/from-violet-950\/20 via-background to-background/g, 'from-primary/5 via-background to-background');
    content = content.replace(/from-violet-950\/50/g, 'from-primary/10');
    content = content.replace(/from-violet-900\/20/g, 'from-primary/5');

    // Button colors (if they didn't get caught by the text-foreground replace)
    content = content.replace(/bg-violet-600 hover:bg-violet-500/g, 'bg-primary hover:bg-primary/90');
    content = content.replace(/bg-violet-500\/10 border-violet-500\/20/g, 'bg-primary/10 border-primary/20');
    content = content.replace(/bg-violet-500\/5 border-violet-500\/20/g, 'bg-primary/5 border-primary/20');
    content = content.replace(/text-violet-500/g, 'text-primary');
    content = content.replace(/bg-violet-500\/10/g, 'bg-primary/10');
    content = content.replace(/border-violet-500\/20/g, 'border-primary/20');
    content = content.replace(/border-violet-500\/30/g, 'border-primary/30');

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated: ${filePath}`);
    }
  }
});
