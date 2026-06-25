import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const apiKey = process.env.GEMINI_API_KEY || process.env.gemini_api_key;
const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

console.log('=== Gemini API Test ===');
console.log('API Key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'MISSING!');
console.log('Model:', modelName);

if (!apiKey) {
  console.error('ERROR: No API key found!');
  process.exit(1);
}

// Check for drawings folder
const drawingsDir = path.resolve(__dirname, '../frontend/public/drawings');
console.log('\nDrawings directory:', drawingsDir);
console.log('Drawings dir exists:', fs.existsSync(drawingsDir));

if (fs.existsSync(drawingsDir)) {
  const files = fs.readdirSync(drawingsDir).slice(0, 5);
  console.log('Files in drawings dir:', files);
}

// Test API
try {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });
  
  console.log('\nTesting simple text generation...');
  const result = await model.generateContent('Say "API test successful" in 5 words or less.');
  const text = result.response.text();
  console.log('✓ API Response:', text);
  
  // Test vision if a drawing exists
  if (fs.existsSync(drawingsDir)) {
    const pngFiles = fs.readdirSync(drawingsDir).filter(f => f.endsWith('.png') || f.endsWith('.jpg'));
    if (pngFiles.length > 0) {
      const testFile = path.join(drawingsDir, pngFiles[0]);
      console.log('\nTesting vision with file:', pngFiles[0]);
      const imageBuffer = fs.readFileSync(testFile);
      const imagePart = {
        inlineData: {
          data: imageBuffer.toString('base64'),
          mimeType: 'image/png'
        }
      };
      const visionResult = await model.generateContent(['Describe this image in one sentence.', imagePart]);
      console.log('✓ Vision Response:', visionResult.response.text().substring(0, 200));
    }
  }
  
} catch (err) {
  console.error('\n✗ API Error:', err.message);
  if (err.message.includes('API_KEY_INVALID') || err.message.includes('invalid')) {
    console.error('→ The API key appears to be invalid or expired');
  } else if (err.message.includes('404')) {
    console.error('→ Model not found. Try a different model name');
  } else if (err.message.includes('429')) {
    console.error('→ Rate limit exceeded');
  }
}
