import { buildCbseCurriculum } from './src/services/curriculum/curriculum-fixtures.js';

console.log('📋 TESTING CURRICULUM GRADE AUTO-MAPPING\n');

const curriculum = buildCbseCurriculum();

console.log('1️⃣  Checking CBSE curriculum...');
console.log(`   Curriculum: ${curriculum.name}`);
console.log(`   Grades available: ${curriculum.gradeLevels.length}`);
console.log(`   Grade range: ${curriculum.gradeLevels[0].label} to ${curriculum.gradeLevels[curriculum.gradeLevels.length - 1].label}\n`);

// Test auto-mapping logic (simulating what curriculum-selection-screen does)
console.log('2️⃣  Testing grade auto-mapping (profile grade → curriculum gradeId)...');
const profileGrade = '3rd Grade';
const matchedGrade = curriculum.gradeLevels.find((g) => g.canonicalGrade === profileGrade);

if (matchedGrade) {
  console.log(`   ✅ Profile grade "${profileGrade}" mapped to curriculum grade`);
  console.log(`      Curriculum gradeId: ${matchedGrade.gradeId}`);
  console.log(`      Curriculum label: ${matchedGrade.label}`);
  console.log(`      Canonical grade: ${matchedGrade.canonicalGrade}\n`);
} else {
  console.log(`   ❌ NO MAPPING FOUND for profile grade "${profileGrade}"\n`);
}

// Test all 1-6 grades map correctly
console.log('3️⃣  Testing all 1-6 grades map to curriculum...');
const validGrades = ['1st Grade', '2nd Grade', '3rd Grade', '4th Grade', '5th Grade', '6th Grade'];
let allMapped = true;
for (const grade of validGrades) {
  const mapped = curriculum.gradeLevels.find((g) => g.canonicalGrade === grade);
  const icon = mapped ? '✅' : '❌';
  console.log(`   ${icon} ${grade} → ${mapped ? mapped.gradeId : 'NOT FOUND'}`);
  if (!mapped) allMapped = false;
}

console.log('');
if (allMapped && matchedGrade) {
  console.log('✅ CURRICULUM AUTO-MAPPING: WORKING (no duplicate asks)');
} else {
  console.log('❌ CURRICULUM AUTO-MAPPING: ISSUES FOUND');
}
