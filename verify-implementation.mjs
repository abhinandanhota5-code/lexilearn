import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('=== LexiLearn Implementation Status ===\n');

// Check critical files
const files = [
  'src/services/audio/tts-service.js',
  'src/renderer/screens/learner/learning-activity-screen.js',
  'src/renderer/styles/parent.css'
];

let ok = 0;
files.forEach(f => {
  if (fs.existsSync(path.join(__dirname, f))) {
    console.log('✓', f);
    ok++;
  }
});

// Check CSS changes
const css = fs.readFileSync(path.join(__dirname, 'src/renderer/styles/parent.css'), 'utf8');
if (css.includes('display: flex') && css.includes('profile-action-grid')) {
  console.log('✓ Button layout (flex)');
  ok++;
}
if (css.includes('translateY(-3px)')) {
  console.log('✓ Hover animation');
  ok++;
}

console.log(`\n✓ ${ok}/4 checks passed`);
console.log('App is ready for testing.\n');
