import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import fs from 'fs';
import { getNaverCompanyData } from '../src/lib/data/naver_finance';
import { analyzeKoreanStock } from '../src/lib/ai/fundamental';
import { sendTelegramMessage } from '../src/lib/telegram';

export async function runFundamentalAnalysis() {
  console.log('============================================');
  console.log('🧠 2단계: AI 심층 기본적 분석 파이프라인 가동');
  console.log('============================================');

  const matchesPath = path.join(process.cwd(), 'src', 'data', 'archive', 'kr_daily_screener_matches.json');
  if (!fs.existsSync(matchesPath)) {
    console.error('1단계 스크리닝 결과 파일이 없습니다. 먼저 npm run scan:kr 을 실행하세요.');
    return;
  }

  const rawMatches = fs.readFileSync(matchesPath, 'utf8');
  let matchedData;
  try {
    matchedData = JSON.parse(rawMatches);
  } catch(e) {
    console.error('스크리닝 결과 파일을 파싱할 수 없습니다.');
    return;
  }

  const matches = matchedData.matches || [];
  
  if (matches.length === 0) {
    console.log('금일 기술적 스크리닝(1단계)을 통과한 종목이 없습니다.');
    console.log('분석을 종료합니다.');
    return;
  }

  console.log(`총 ${matches.length}개 종목에 대한 기본적 분석을 시작합니다...`);
  
  const finalReports: any[] = [];

  for (let i = 0; i < matches.length; i++) {
    const stock = matches[i];
    console.log(`\n[${i+1}/${matches.length}] ${stock.companyName} (${stock.ticker}) 데이터 수집 중...`);
    
    // 1. 네이버 금융 데이터/뉴스 스크래핑
    const companyData = await getNaverCompanyData(stock.ticker);
    
    if (!companyData) {
      console.log(`⚠️ ${stock.companyName} 데이터 수집 실패. 건너뜁니다.`);
      continue;
    }

    console.log(`✅ ${stock.companyName} 데이터 수집 완료. AI 분석 중...`);

    // 2. AI(Gemini) 분석 돌리기
    try {
      const aiReport = await analyzeKoreanStock(companyData, stock.matchReasons);
      console.log(`💡 AI 판정 결과: [${aiReport.final_decision}] (성공 확률: ${aiReport.target_return_probability}%)`);
      
      finalReports.push({
        ticker: stock.ticker,
        companyName: stock.companyName,
        date: new Date().toISOString(),
        technicalReasons: stock.matchReasons,
        aiAnalysis: aiReport,
        rawFinancials: companyData.financials
      });
      
      // 3. BUY 판정 시 시뮬레이션 포트폴리오 자동 편입 및 텔레그램 알림 전송
      if (aiReport.final_decision === 'BUY') {
        const trackedPath = path.join(process.cwd(), 'src', 'data', 'kr_tracked_stocks.json');
        let trackedDb: any = { stocks: [] };
        if (fs.existsSync(trackedPath)) {
          trackedDb = JSON.parse(fs.readFileSync(trackedPath, 'utf8'));
        }

        const existingStock = trackedDb.stocks.find((s: any) => s.ticker === stock.ticker && s.status === 'TRACKING');
        if (!existingStock) {
          const entryPrice = stock.close || 0;
          const targetPrice = entryPrice * 1.5; // +50% 목표
          const stopLossPrice = entryPrice * 0.9; // -10% 손절

          trackedDb.stocks.push({
            ticker: stock.ticker,
            companyName: stock.companyName,
            addedDate: new Date().toISOString(),
            entryPrice,
            targetPrice,
            stopLossPrice,
            status: 'TRACKING'
          });
          fs.writeFileSync(trackedPath, JSON.stringify(trackedDb, null, 2));
          console.log(`💼 [자동 편입 완료] ${stock.companyName} (목표가: ${targetPrice}, 손절가: ${stopLossPrice})`);
        }

        const msg = `🚨 <b>[AI 매수 추천 알림]</b> 🚨\n\n` +
          `🏢 <b>종목:</b> ${stock.companyName} (${stock.ticker})\n` +
          `🎯 <b>타점 사유:</b> ${stock.matchReasons[0] || '차트 타점 포착'}\n\n` +
          `📈 <b>성공 확률:</b> ${aiReport.target_return_probability}%\n\n` +
          `💼 <b>비즈니스 요약:</b>\n${aiReport.business_summary}\n\n` +
          `🔥 <b>모멘텀 요약:</b>\n${aiReport.momentum_analysis}\n\n` +
          `✅ <b>액션 플랜:</b>\n${aiReport.action_plan}\n\n` +
          `👉 <a href="http://localhost:3000/kr-report/${stock.ticker}?type=BUY">상세 심층 보고서 웹에서 보기</a>\n` +
          `<i>※ 해당 종목은 시뮬레이션 포트폴리오에 자동 편입되었습니다.</i>`;
        
        await sendTelegramMessage(msg);
      }
      
    } catch (e: any) {
      console.log(`⚠️ ${stock.companyName} AI 분석 실패:`, e.message);
    }
    
    // API 호출 속도 조절
    await new Promise(res => setTimeout(res, 2000));
  }

  console.log('\n============================================');
  console.log(`🎯 분석 종료! 총 ${finalReports.length}개 종목 리포트 생성 완료.`);
  
  const savePath = path.join(process.cwd(), 'src', 'data', 'archive', 'kr_fundamental_reports.json');
  fs.writeFileSync(savePath, JSON.stringify({
    date: new Date().toISOString(),
    count: finalReports.length,
    reports: finalReports
  }, null, 2));

  console.log(`✅ 결과가 ${savePath} 에 저장되었습니다.`);
  console.log('============================================');
}

if (require.main === module || process.argv[1].endsWith('run_fundamental_analysis.ts')) {
  runFundamentalAnalysis().catch(err => {
    console.error('분석 러너 실행 중 오류 발생:', err);
  });
}
