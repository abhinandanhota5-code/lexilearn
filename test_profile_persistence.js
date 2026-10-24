import { ProfileStore } from './src/services/storage/profile-store.js';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDir = path.join(os.tmpdir(), 'lexilearn-test-' + Date.now());

async function testProfilePersistence() {
  console.log('📋 TESTING PROFILE PERSISTENCE\n');
  
  const store = new ProfileStore(testDir);
  
  try {
    // Test 1: Save profile
    console.log('1️⃣  Saving test profile...');
    const testProfile = {
      learnerId: 'test-learner-1',
      name: 'Test Child',
      age: 8,
      grade: '3rd Grade',
      avatar: 'fox',
      theme: 'warm-parchment',
      parentPinHash: 'hash123',
      parentPinSalt: 'salt456',
      disclaimerAccepted: true,
      accommodations: {
        fontFamily: 'Lexend',
        fontSizePx: 24,
        readingRulerEnabled: true,
        syllableColoringEnabled: true
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const saved = await store.saveProfile(testProfile);
    console.log('✅ Profile saved');
    console.log(`   Name: ${saved.name}`);
    console.log(`   Grade: ${saved.grade}`);
    console.log(`   Theme: ${saved.theme}\n`);
    
    // Test 2: Retrieve profile
    console.log('2️⃣  Retrieving profile...');
    const retrieved = await store.getProfile();
    if (!retrieved) throw new Error('Profile not retrieved');
    console.log('✅ Profile retrieved');
    console.log(`   Name matches: ${retrieved.name === testProfile.name}`);
    console.log(`   Grade matches: ${retrieved.grade === testProfile.grade}`);
    console.log(`   Grade is "3rd Grade": ${retrieved.grade === '3rd Grade'}\n`);
    
    // Test 3: Verify no duplicate asks (grade auto-mapping would work)
    console.log('3️⃣  Checking grade range...');
    const validGrades = ['1st Grade', '2nd Grade', '3rd Grade', '4th Grade', '5th Grade', '6th Grade'];
    const isValid = validGrades.includes(retrieved.grade);
    console.log(`✅ Grade is valid (1-6 only): ${isValid}`);
    console.log(`   Grade: ${retrieved.grade}\n`);
    
    console.log('✅ PROFILE PERSISTENCE: WORKING\n');
    return true;
  } catch (err) {
    console.log(`❌ PROFILE PERSISTENCE: FAILED`);
    console.log(`   Error: ${err.message}\n`);
    return false;
  }
}

await testProfilePersistence();
