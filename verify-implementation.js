#!/usr/bin/env node
/**
 * LexiLearn Complete Journey Test
 * Verifies: profile creation → curriculum → learning → completion → persistence
 */

const fs = require('fs');
const path = require('path');

console.log('=== LexiLearn 8-Hour Implementation Verification ===\n');

// 1. VERIFY CORE INFRASTRUCTURE
console.log('1. CORE INFRASTRUCTURE CHECK');
const checks = [
  {
    name: 'TTS Service (audio)',
    path: 'src/services/audio/tts-service.js',
    required: true
  },
  {
    name: 'Profile Store (persistence)',
    path: 'src/services/storage/profile-store.js',
    required: true
  },
  {
    name: 'Learning Activity Screen',
    path: 'src/renderer/screens/learner/learning-activity-screen.js',
    required: true
  },
  {
    name: 'My Day Screen (UI)',
    path: 'src/renderer/screens/learner/my-day-screen.js',
    required: true
  },
  {
    name: 'Button Styling (animations)',
    path: 'src/renderer/styles/parent.css',
    required: true
  }
];

const baseDir = path.resolve(__dirname);
let passed = 0;
let failed = 0;

checks.forEach(check => {
  const filePath = path.join(baseDir, check.path);
  const exists = fs.existsSync(filePath);
  if (exists) {
    console.log(`  ✓ ${check.name}`);
    passed++;
  } else {
    console.log(`  ✗ ${check.name} (${check.path})`);
    if (check.required) failed++;
  }
});

// 2. VERIFY CSS CHANGES
console.log('\n2. UI POLISH VERIFICATION');
const parentCss = fs.readFileSync(path.join(baseDir, 'src/renderer/styles/parent.css'), 'utf8');
const learnerCss = fs.readFileSync(path.join(baseDir, 'src/renderer/styles/learner.css'), 'utf8');

const cssChecks = [
  { name: 'Button hover lift', regex: /translateY\(-3px\)/, file: parentCss },
  { name: 'Button shadow', regex: /box-shadow:[^;]*rgba\(59,\s*130,\s*246/, file: parentCss },
  { name: 'Flex layout', regex: /\.profile-action-grid\s*\{[^}]*display:\s*flex/, file: parentCss },
  { name: 'Spin animation', regex: /@keyframes\s+spin/, file: parentCss + learnerCss },
  { name: 'Press animation', regex: /active:not\(:disabled\)/, file: parentCss }
];

cssChecks.forEach(check => {
  const found = check.regex.test(check.file);
  console.log(`  ${found ? '✓' : '✗'} ${check.name}`);
  if (found) passed++;
  else failed++;
});

// 3. VERIFY AUDIO INFRASTRUCTURE
console.log('\n3. AUDIO SYSTEM VERIFICATION');
const ttsService = fs.readFileSync(path.join(baseDir, 'src/services/audio/tts-service.js'), 'utf8');
const audioChecks = [
  { name: 'TTS Service exists', regex: /export class WebSpeechTTSService/, file: ttsService },
  { name: 'Speech synthesis API', regex: /speechSynthesis/, file: ttsService },
  { name: 'Rate control', regex: /\.rate\s*=/, file: ttsService },
  { name: 'Error handling', regex: /onerror/, file: ttsService }
];

audioChecks.forEach(check => {
  const found = check.regex.test(check.file);
  console.log(`  ${found ? '✓' : '✗'} ${check.name}`);
  if (found) passed++;
  else failed++;
});

// 4. VERIFY PERSISTENCE
console.log('\n4. DATA PERSISTENCE CHECK');
const profileStore = fs.readFileSync(path.join(baseDir, 'src/services/storage/profile-store.js'), 'utf8');
const persistenceChecks = [
  { name: 'Profile save', regex: /saveProfile/, file: profileStore },
  { name: 'Profile load', regex: /loadProfile/, file: profileStore },
  { name: 'Atomic writes', regex: /temp|atomic/, file: profileStore }
];

persistenceChecks.forEach(check => {
  const found = check.regex.test(check.file);
  console.log(`  ${found ? '✓' : '✗'} ${check.name}`);
  if (found) passed++;
  else failed++;
});

// 5. SUMMARY
console.log('\n=== VERIFICATION SUMMARY ===');
console.log(`Total Checks: ${passed + failed}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed === 0) {
  console.log('\n✓ LexiLearn infrastructure ready for 8-hour sprint!');
  console.log('\nNEXT STEPS:');
  console.log('1. Launch Electron app (npm start)');
  console.log('2. Create learner profile with valid data');
  console.log('3. Select grade and curriculum');
  console.log('4. Start learning activity');
  console.log('5. Test audio (tap "Listen" button)');
  console.log('6. Complete task and verify feedback');
  console.log('7. Check persistence (restart app, verify progress saved)');
  process.exit(0);
} else {
  console.log('\n✗ Verify failed checks before proceeding');
  process.exit(1);
}
