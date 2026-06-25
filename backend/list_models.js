import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

const apiKey = process.env.GEMINI_API_KEY || process.env.gemini_api_key;
console.log('API Key:', apiKey?.substring(0, 12) + '...');

// List all available models
const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=100`);
const data = await res.json();

if (data.error) {
  console.error('Error:', data.error);
} else {
  const models = data.models || [];
  console.log(`\nTotal models: ${models.length}`);
  
  // Filter to only generative models that support generateContent
  const generative = models.filter(m => 
    (m.supportedGenerationMethods || []).includes('generateContent')
  );
  
  console.log(`\nModels supporting generateContent (${generative.length}):`);
  generative.forEach(m => {
    const supportsVision = (m.description || '').toLowerCase().includes('vision') || 
                           (m.description || '').toLowerCase().includes('multimodal') ||
                           (m.description || '').toLowerCase().includes('image');
    console.log(`  ${m.name}  ${supportsVision ? '(vision)' : ''}`);
  });
}
