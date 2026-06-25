import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

const apiKey = process.env.GEMINI_API_KEY || process.env.gemini_api_key;
const genAI = new GoogleGenerativeAI(apiKey);

// Try these model names in order
const modelsToTry = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-001',
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
];

const drawingsDir = path.resolve(__dirname, '../frontend/public/drawings');
const pngFiles = fs.readdirSync(drawingsDir).filter(f => f.endsWith('.png'));
const testFile = path.join(drawingsDir, pngFiles[0]);
const imageBuffer = fs.readFileSync(testFile);
const imagePart = {
  inlineData: {
    data: imageBuffer.toString('base64'),
    mimeType: 'image/png'
  }
};

for (const modelName of modelsToTry) {
  console.log(`\nTrying model: ${modelName}`);
  try {
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent([
      'List 3 architectural elements you can see in this drawing. Return just the list.',
      imagePart
    ]);
    console.log(`✓ SUCCESS with ${modelName}:`);
    console.log(result.response.text().substring(0, 300));
    console.log(`\n✓ Use GEMINI_MODEL=${modelName}`);
    break;
  } catch (err) {
    console.error(`✗ ${modelName}: ${err.message?.split('\n')[0]}`);
  }
}
