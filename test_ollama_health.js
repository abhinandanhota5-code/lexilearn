import { OllamaLLMProvider } from './src/services/ai/ollama-provider.js';

console.log('📋 TESTING OLLAMA HEALTH CHECK\n');

const provider = new OllamaLLMProvider();

console.log('Attempting health check...');
try {
  const health = await provider.healthCheck();
  console.log('✅ Health check returned');
  console.log(JSON.stringify(health, null, 2));
} catch (err) {
  console.log('❌ Health check failed (expected if Ollama not running)');
  console.log(`Error: ${err.code || err.name}`);
  console.log(`Message: ${err.message}`);
  
  if (err.code === 'OLLAMA_UNAVAILABLE') {
    console.log('\n✅ Error handling is correct - app will gracefully degrade');
  }
}
