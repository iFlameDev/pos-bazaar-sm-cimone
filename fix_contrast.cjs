const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'components');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  content = content.replace(/text-carnival-yellow/g, 'text-carnival-pink');
  content = content.replace(/bg-transparent\/95/g, 'bg-white/90');
  
  fs.writeFileSync(filePath, content);
  console.log(`Fixed ${file}`);
});
