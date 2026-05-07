import { getIBNews } from './src/lib/data/yahoo.js';
import { formatIBNews } from './src/lib/ai/gemini.js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function test() {
  console.log('Fetching...');
  const news = await getIBNews();
  console.log(`Fetched ${news.length} news items`);
  if (news.length > 0) {
    console.log(news[0]);
  }
  
  console.log('Formatting...');
  try {
    const formatted = await formatIBNews(news);
    console.log(`Formatted ${formatted.length} items`);
    if (formatted.length === 0) {
      console.log('Returned empty array');
    }
  } catch (e) {
    console.error('Format error:', e);
  }
}

test();
