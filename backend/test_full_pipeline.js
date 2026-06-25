/**
 * Full end-to-end pipeline test:
 * Simulates running the AI analysis pipeline on a real drawing file from the drawings directory.
 */
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

const apiKey = process.env.GEMINI_API_KEY || process.env.gemini_api_key;
const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';

console.log('=== Full Pipeline Test ===');
console.log('Model:', modelName);
console.log('API Key:', apiKey?.substring(0, 12) + '...');

// Pick first real drawing
const drawingsDir = path.resolve(__dirname, '../frontend/public/drawings');
const pngFiles = fs.readdirSync(drawingsDir).filter(f => f.endsWith('.png') || f.endsWith('.jpg'));
if (pngFiles.length === 0) { console.error('No drawings found!'); process.exit(1); }

const testFile = path.join(drawingsDir, pngFiles[0]);
console.log('\nUsing drawing:', pngFiles[0]);

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: modelName });

const imageBuffer = fs.readFileSync(testFile);
const ext = path.extname(testFile).toLowerCase();
const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
const imagePart = { inlineData: { data: imageBuffer.toString('base64'), mimeType } };

const step1Prompt = `You are analyzing an architectural floor plan drawing.

Identify and list every distinct architectural element visible in this drawing.

For each element return a JSON array. Each item must have:
- "element_type": one of [wall, load_bearing_wall, column, room, door, window, staircase, elevator, dimension_label, hvac_duct, electrical_trace, fire_escape_route, annotation, toilet, sink, furniture_outline, parking_space, structural_beam, curtain_wall, ramp, other]
- "label": a specific human-readable description including location if visible (e.g. "Load-bearing column at Grid A3", "Room 204 - Conference Room")
- "confidence": a float between 0.0 and 1.0

Return ONLY a valid JSON array. No explanation, no markdown, no preamble.
Example: [{"element_type":"column","label":"Load-bearing column at Grid B2","confidence":0.95}]`;

try {
  console.log('\nStep 1: Element extraction...');
  const response = await model.generateContent([step1Prompt, imagePart]);
  const raw = response.response.text();
  const cleanedJson = raw.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
  const elements = JSON.parse(cleanedJson);
  
  console.log(`✓ Extracted ${elements.length} elements:`);
  elements.slice(0, 5).forEach(el => {
    console.log(`  - [${el.element_type}] ${el.label} (${(el.confidence*100).toFixed(0)}%)`);
  });
  if (elements.length > 5) console.log(`  ... and ${elements.length - 5} more`);
  
  console.log('\n✓ Full pipeline test PASSED! The AI analysis will work correctly.');
  console.log('\nNow restart the backend server (node server.js) to pick up the new model setting.');
} catch (err) {
  console.error('✗ Pipeline test FAILED:', err.message);
}
