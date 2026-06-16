const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'components');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  content = content.replace(/bg-carnival-pink text-slate-900/g, 'bg-carnival-pink text-white');
  content = content.replace(/bg-carnival-peach text-slate-900/g, 'bg-carnival-peach text-white');
  content = content.replace(/bg-carnival-blue text-slate-900/g, 'bg-carnival-blue text-white');
  
  fs.writeFileSync(filePath, content);
  console.log(`Fixed contrast for ${file}`);
});
