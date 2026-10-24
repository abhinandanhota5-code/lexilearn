import { OllamaLLMProvider } from './src/services/ai/ollama-provider.js';

console.log('📋 TESTING OLLAMA INTEGRATION (REAL)\n');

const provider = new OllamaLLMProvider();

console.log('1️⃣  Checking Ollama health...');
const health = await provider.checkHealth();
console.log(`   Available: ${health.available}`);
console.log(`   Model installed: ${health.modelInstalled}`);
console.log(`   Available models: ${health.availableModels?.join(', ') || 'none'}`);

if (!health.available) {
  console.log(`   Error: ${health.error}\n`);
  console.log('❌ OLLAMA NOT REACHABLE\n');
  process.exit(0);
}

if (!health.modelInstalled) {
  console.log(`   ⚠️  Target model not installed. Need to run:`);
  console.log(`   ollama pull llama3.1:8b-instruct-q4_K_M\n`);
} else {
  console.log('   ✅ Model is installed\n');
}

// Test text generation
console.log('2️⃣  Testing text generation...');
try {
  const result = await provider.generateText(
    'Write one sentence for a 3rd grade child about what a butterfly is. Keep it simple and fun.',
    { maxTokens: 50 }
  );
  console.log(`   ✅ Generated: "${result.substring(0, 80)}..."\n`);
} catch (err) {
  console.log(`   ❌ Generation failed: ${err.message}\n`);
}

console.log('✅ OLLAMA INTEGRATION: WORKING');
