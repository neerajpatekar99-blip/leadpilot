import Groq from 'groq-sdk';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function list() {
  const models = await groq.models.list();
  console.log('Available Groq Models:');
  models.data.forEach(m => console.log(`- ${m.id}`));
}

list().catch(console.error);
