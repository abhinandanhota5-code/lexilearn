import { validateProfileInput, GRADE_LEVELS } from './src/shared/profile-schema.js';

console.log('📋 TESTING GRADE VALIDATION\n');

// Test 1: Check GRADE_LEVELS constant
console.log('1️⃣  Checking GRADE_LEVELS constant...');
console.log(`   Total grades: ${GRADE_LEVELS.length}`);
console.log(`   Grades: ${GRADE_LEVELS.join(', ')}`);
const hasKindergarten = GRADE_LEVELS.includes('Kindergarten');
const hasClass7 = GRADE_LEVELS.includes('7th Grade');
console.log(`   Has Kindergarten: ${hasKindergarten} (should be false)`);
console.log(`   Has 7th Grade: ${hasClass7} (should be false)\n`);

// Test 2: Valid grade acceptance
console.log('2️⃣  Testing valid grade (3rd Grade)...');
const validInput = {
  name: 'Test',
  age: 8,
  grade: '3rd Grade',
  avatar: 'fox',
  theme: 'warm-parchment'
};
const validResult = validateProfileInput(validInput);
console.log(`   Valid: ${validResult.isValid}`);
console.log(`   Errors: ${JSON.stringify(validResult.errors)}\n`);

// Test 3: Invalid grade rejection (Kindergarten)
console.log('3️⃣  Testing invalid grade (Kindergarten)...');
const invalidKG = { ...validInput, grade: 'Kindergarten' };
const resultKG = validateProfileInput(invalidKG);
console.log(`   Valid: ${resultKG.isValid} (should be false)`);
console.log(`   Error: ${resultKG.errors.grade}\n`);

// Test 4: Invalid grade rejection (7th Grade)
console.log('4️⃣  Testing invalid grade (7th Grade)...');
const invalid7 = { ...validInput, grade: '7th Grade' };
const result7 = validateProfileInput(invalid7);
console.log(`   Valid: ${result7.isValid} (should be false)`);
console.log(`   Error: ${result7.errors.grade}\n`);

const allCorrect = 
  !hasKindergarten && 
  !hasClass7 && 
  GRADE_LEVELS.length === 6 &&
  validResult.isValid &&
  !resultKG.isValid &&
  !result7.isValid;

if (allCorrect) {
  console.log('✅ GRADE VALIDATION: WORKING (1-6 only enforced)');
} else {
  console.log('❌ GRADE VALIDATION: ISSUES FOUND');
}
