import { NextResponse } from 'next/server';
import { getMacroIndicators } from '@/lib/data/fred';
import { getETFData, getUSNews } from '@/lib/data/yahoo';
import { analyzeMacroData } from '@/lib/ai/gemini';
import { saveDailyArchive, getDailyArchives, getLessons } from '@/lib/data/archive';

export const dynamic = 'force-dynamic'; // Always fetch fresh data

export async function GET() {
  try {
    // 1. Fetch Macro Data
    console.log('Fetching FRED data...');
    const macroData = await getMacroIndicators();
    
    // 2. Fetch ETF Data & News
    console.log('Fetching Yahoo Finance data & news...');
    const etfData = await getETFData();
    const newsData = await getUSNews();
    
    // 3. Get Previous Portfolio State & Lessons
    const archives = getDailyArchives();
    const todayString = new Date().toISOString().split('T')[0];
    const todayArchive = archives.find(a => a.date === todayString);
    const previousArchive = archives.length > 0 ? archives[0].analysis : null;
    const lessons = getLessons();

    // 4. Analyze with Gemini (오늘 날짜 분석본이 이미 있으면 스킵)
    let analysis;
    if (todayArchive) {
      console.log('Today already has an analysis. Returning cached version...');
      analysis = todayArchive.analysis;
    } else {
      console.log('Analyzing with Gemini...');
      analysis = await analyzeMacroData(macroData, etfData, newsData, previousArchive, lessons);
      
      // 5. Archive Complete Analysis
      if (analysis) {
        saveDailyArchive(analysis);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        macroData,
        etfData,
        newsData,
        analysis
      }
    });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
