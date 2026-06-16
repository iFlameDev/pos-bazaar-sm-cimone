const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'components');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

const replacements = {
  'bg-slate-950/90': 'bg-white/90',
  'bg-slate-950/80': 'bg-white/80',
  'bg-slate-950/60': 'bg-white/60',
  'bg-slate-950/50': 'bg-white/50',
  'bg-slate-950': 'bg-transparent',
  'bg-slate-900/95': 'bg-white/95',
  'bg-slate-900/90': 'bg-white/90',
  'bg-slate-900/80': 'bg-white/80',
  'bg-slate-900': 'bg-white',
  'bg-slate-800/80': 'bg-white/80',
  'bg-slate-800/60': 'bg-white/60',
  'bg-slate-800/40': 'bg-white/40',
  'bg-slate-800/30': 'bg-slate-50/50',
  'bg-slate-800': 'bg-white',
  'bg-slate-700/50': 'bg-slate-100/50',
  'bg-slate-700/30': 'bg-slate-100/30',
  'bg-slate-700': 'bg-slate-100',
  'bg-slate-600': 'bg-slate-200',
  'border-slate-800/60': 'border-slate-200/60',
  'border-slate-800': 'border-slate-200',
  'border-slate-700/50': 'border-slate-200/50',
  'border-slate-700/40': 'border-slate-200/40',
  'border-slate-700/30': 'border-slate-200/30',
  'border-slate-700': 'border-slate-200',
  'border-slate-600/50': 'border-slate-300/50',
  'text-slate-100': 'text-slate-900',
  'text-slate-200': 'text-slate-800',
  'text-slate-300': 'text-slate-700',
  'text-slate-400': 'text-slate-600',
  'text-slate-500': 'text-slate-500',
  'text-white': 'text-slate-900'
};

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  for (const [key, value] of Object.entries(replacements)) {
    content = content.split(key).join(value);
  }
  
  fs.writeFileSync(filePath, content);
  console.log(`Updated ${file}`);
});
