import Groq from 'groq-sdk';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function test() {
  const start = Date.now();
  const res = await groq.chat.completions.create({
    model: 'openai/gpt-oss-20b',
    messages: [
      { role: 'system', content: 'You are a real estate agent in Mumbai. Reply in JSON with "message": string' },
      { role: 'user', content: 'Looking for 2BHK in Kharghar' }
    ],
    response_format: { type: 'json_object' }
  });
  console.log(`Response in ${Date.now() - start}ms:`, res.choices[0].message.content);
}

test().catch(console.error);
