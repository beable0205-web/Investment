import { NextResponse } from 'next/server';
import { getIBNews } from '@/lib/data/yahoo';
import { formatIBNews } from '@/lib/ai/gemini';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const cacheDir = path.join(process.cwd(), 'src', 'data', 'archive', 'ib-news');
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    const cacheFile = path.join(cacheDir, `${todayStr}.json`);

    if (fs.existsSync(cacheFile)) {
      const cachedData = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
      if (cachedData && cachedData.length > 0) {
        console.log('Today IB News Cache exists and is valid. Returning cached data...');
        return NextResponse.json({ success: true, data: cachedData });
      }
    }

    console.log('Fetching raw IB news from Yahoo Finance...');
    const rawNews = await getIBNews();

    if (!rawNews || rawNews.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    console.log(`Formatting ${rawNews.length} IB news articles via AI...`);
    const formattedNews = await formatIBNews(rawNews);

    // Cache the result only if valid
    if (formattedNews && formattedNews.length > 0) {
      fs.writeFileSync(cacheFile, JSON.stringify(formattedNews, null, 2), 'utf-8');
    }

    return NextResponse.json({
      success: true,
      data: formattedNews
    });
  } catch (error: any) {
    console.error('IB News API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
