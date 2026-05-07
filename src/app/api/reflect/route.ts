import { NextResponse } from 'next/server';
import { getDailyArchives, saveLesson } from '@/lib/data/archive';
import { getMacroIndicators } from '@/lib/data/fred';
import { getETFData } from '@/lib/data/yahoo';
import { reflectOnPerformance } from '@/lib/ai/gemini';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const archives = getDailyArchives();
    if (archives.length === 0) {
      return NextResponse.json({ success: true, message: "No archives available for reflection yet." });
    }

    // 최소 3일(또는 가장 오래된) 전의 아카이브 선택 (현실적으로는 7일 전이 좋으나, 테스트를 위해 마지막 아카이브 선택)
    const oldArchive = archives[archives.length - 1]; 

    console.log(`Reflecting on archive from ${oldArchive.date}...`);

    // 현재 시장 상황 다시 가져오기
    const macroData = await getMacroIndicators();
    const etfData = await getETFData();

    const reflectionResult = await reflectOnPerformance(oldArchive.analysis, macroData, etfData);

    const today = new Date().toISOString().split('T')[0];
    
    // 새 교훈 저장
    saveLesson({
      date: today,
      reflection: reflectionResult.reflection,
      principle: reflectionResult.principle
    });

    return NextResponse.json({
      success: true,
      data: reflectionResult
    });
  } catch (error: any) {
    console.error('Reflection API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
