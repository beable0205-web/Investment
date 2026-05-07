import { NextResponse } from 'next/server';
import { getCompanyDeepData, getCompanyHistoricalData } from '@/lib/data/yahoo';
import { getDartCompanyData } from '@/lib/data/dart';
import { getFmpCompanyData } from '@/lib/data/fmp';
import { generateFundamentalReport, generateTechnicalReport } from '@/lib/ai/companyAnalyzer';
import { checkCompanyUsageLimit, saveCompanyArchive } from '@/lib/data/archive';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get('ticker');
  const type = searchParams.get('type');

  if (!ticker) {
    return NextResponse.json({ success: false, error: 'Ticker parameter is required' }, { status: 400 });
  }
  if (!type || (type !== 'fundamental' && type !== 'technical')) {
    return NextResponse.json({ success: false, error: 'Invalid or missing type parameter (fundamental/technical required)' }, { status: 400 });
  }

  // 일일 한도 체크 (5회 제한)
  if (!checkCompanyUsageLimit()) {
    return NextResponse.json({ 
      success: false, 
      error: '일일 기업 검색 한도(5회)를 초과했습니다. 자정(KST 기준)에 한도가 초기화됩니다.' 
    }, { status: 429 });
  }

  try {
    console.log(`Fetching comprehensive data for ${ticker.toUpperCase()}...`);
    const [yahooData, history] = await Promise.all([
      getCompanyDeepData(ticker),
      getCompanyHistoricalData(ticker)
    ]);

    if (!history || history.length === 0) {
      throw new Error('히스토리 데이터를 불러올 수 없습니다.');
    }

    // 기관급 데이터 패치 시도 (실패해도 야후 데이터로 fallback)
    let institutionalData = null;
    if (/\d/.test(ticker)) {
      // 한국 주식 (DART)
      institutionalData = await getDartCompanyData(ticker);
    } else {
      // 미국 주식 (FMP)
      institutionalData = await getFmpCompanyData(ticker);
    }

    // 병합된 companyData 생성
    const companyData = {
      ...yahooData,
      institutional: institutionalData
    };
    
    const currentPrice = history[history.length - 1].close;

    console.log(`Generating ${type} Report for ${ticker.toUpperCase()}...`);
    
    let reportObj: any = {};
    if (type === 'fundamental') {
      const fundamentalReport = await generateFundamentalReport(ticker, companyData, currentPrice);
      reportObj = { fundamental: fundamentalReport };
    } else {
      const technicalReport = await generateTechnicalReport(ticker, companyData, history, currentPrice);
      reportObj = { technical: technicalReport };
    }

    // 아카이브에 병합 저장 (이전 데이터 보존)
    saveCompanyArchive(ticker, reportObj);

    return NextResponse.json({
      success: true,
      data: reportObj
    });
  } catch (error: any) {
    console.error(`Company API Error for ${ticker}:`, error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
