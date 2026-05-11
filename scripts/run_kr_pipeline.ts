import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import { runKRDailyScreener } from './run_kr_daily_screener';
import { getNaverCompanyData } from '../src/lib/data/naver_finance';
import { analyzeKoreanStock } from '../src/lib/ai/fundamental';
import { runKrTrendFollowing } from './run_kr_trend_following';
import { sendTelegramMessage, sendTelegramDocument } from '../src/lib/telegram';
import { generateHtmlReport } from '../src/lib/report_generator';

export async function runKrPipeline() {
  console.log('============================================');
  console.log('🚀 [전체 파이프라인 시작] KOREAN STOCK AI SYSTEM');
  console.log('============================================');

  // 1. 전 종목 기술적 스크리닝 (완화된 필터 적용)
  console.log('\n[Phase 1] 1차 기술적 스크리닝 진행 중...');
  const screenerMatches = await runKRDailyScreener();

  if (screenerMatches.length === 0) {
    console.log('포착된 1차 타점 종목이 없습니다. 파이프라인을 종료합니다.');
    await sendTelegramMessage('🤖 오늘 장 마감 스캐닝 결과: 기술적 매수 타점에 진입한 종목이 없습니다.');
    return;
  }

  console.log(`\n[Phase 2] AI 심층 필터링 시작... (대상: ${screenerMatches.length}종목)`);
  
  const dbPath = path.join(process.cwd(), 'src', 'data', 'kr_tracked_stocks.json');
  let db: any = { stocks: [] };
  if (fs.existsSync(dbPath)) {
    db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  }

  const approvedStocks = [];
  const droppedStocks = [];

  // 2. AI Fundamental 분석 및 최종 승인
  for (const match of screenerMatches) {
    console.log(`\n🔍 AI 분석 중: ${match.companyName} (${match.ticker})`);
    
    // 이미 트래킹 중이거나 매도(SOLD)된 종목은 중복 추가 방지
    const alreadyExists = db.stocks.find((s: any) => s.ticker === match.ticker);
    if (alreadyExists) {
      console.log(`=> 이미 포트폴리오(Tracking/Sold)에 존재하는 종목입니다. (스킵)`);
      continue;
    }

    try {
      const companyData = await getNaverCompanyData(match.ticker);
      if (!companyData) {
        console.log(`=> 네이버 금융 데이터 조회 실패. (스킵)`);
        continue;
      }

      // Gemini AI에게 물어보기
      const aiReport = await analyzeKoreanStock(companyData, match.matchReasons);
      
      console.log(`=> AI 판정: ${aiReport.final_decision} (승률 예상: ${aiReport.target_return_probability}%)`);
      
      // 대표님이 "알짜배기 1~3개만" 요구하셨으므로, 무조건 BUY 판정 + 확률 60% 이상인 종목만 취급
      if (aiReport.final_decision === 'BUY' && (aiReport.target_return_probability >= 60 || aiReport.target_return_probability == null)) {
        
        const currentTrackingCount = db.stocks.filter((s: any) => s.status === 'TRACKING').length;
        if (currentTrackingCount >= 10) {
          console.log(`❌ [편입 보류] 이미 최대 보유 종목 수(10개)에 도달했습니다. (${match.companyName} 스킵)`);
          continue;
        }

        let cash = db.account?.cash || 0;
        if (cash < 1000000) {
          console.log(`❌ [편입 보류] 보유 현금이 부족합니다. (현재 잔고: ${cash.toLocaleString()}원)`);
          continue;
        }

        // 종목당 최대 1억 매수, 현금 부족시 남은 현금 전부 매수
        const maxInvestment = 100000000;
        const targetInvestAmount = Math.min(cash, maxInvestment);
        const shares = Math.floor(targetInvestAmount / match.close);
        const actualInvested = shares * match.close;

        if (shares <= 0) {
          console.log(`❌ [편입 보류] 1주를 살 현금조차 부족합니다.`);
          continue;
        }

        console.log(`🌟 [합격] ${match.companyName} 편입 결정! (${shares}주 / ${actualInvested.toLocaleString()}원 매수)`);
        
        // 잔고 차감
        if (db.account) {
          db.account.cash -= actualInvested;
        }

        // 데이터베이스에 추가
        const newStock = {
          id: `${match.ticker}-${Date.now()}`,
          ticker: match.ticker,
          companyName: match.companyName,
          addedDate: new Date().toISOString(),
          entryPrice: match.close,
          currentPrice: match.close,
          shares: shares,
          investedAmount: actualInvested,
          unrealizedROI: 0,
          status: 'TRACKING',
          matchReasons: match.matchReasons,
          targetPrice: Math.round(match.close * 1.5), // 목표수익률 50%
          stopLossPrice: Math.round(match.close * 0.90), // 기본 하드 스탑 (손절선 -10%)
          aiReport: aiReport
        };
        
        db.stocks.push(newStock);
        approvedStocks.push(newStock);

        // SMIC 딥다이브 리포트 생성 및 텔레그램 전송
        try {
          console.log(`=> 📄 SMIC 딥다이브 리포트(.html) 생성 및 텔레그램 전송 중...`);
          const reportPath = generateHtmlReport(match.companyName, match.ticker, aiReport);
          const caption = `🔥 [SMIC 딥다이브 리포트] ${match.companyName}\n\nAI가 심층 기본적 분석을 마쳤습니다. 첨부된 문서를 확인하세요. (웹 브라우저로 열람 가능)`;
          await sendTelegramDocument(reportPath, caption);
        } catch (reportErr) {
          console.error(`=> ❌ 리포트 문서 생성/전송 실패:`, reportErr);
        }

      } else {
        console.log(`🗑️ [탈락] AI가 투자 가치가 낮다고 판단했습니다. (${aiReport.final_decision})`);
        droppedStocks.push(match.companyName);
      }
      
      // API Rate Limit 방지
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (e: any) {
      console.error(`=> AI 분석 중 오류 발생: ${e.message}`);
    }
  }

  // 3. 변경된 포트폴리오 저장
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

  // 4. 사후 관리 (Trend Following) 실행 -> 목표가 도달 및 손절가 이탈 검사 (기존 보유 종목 포함)
  console.log('\n[Phase 3] 포트폴리오 사후 관리(익절/손절) 및 수익률 검사...');
  await runKrTrendFollowing();

  // 5. 텔레그램 최종 브리핑
  console.log('\n[Phase 4] 텔레그램 최종 브리핑 발송...');
  let msg = `🤖 <b>[일일 스캐닝 및 포트폴리오 리포트]</b>\n\n`;
  msg += `📊 <b>1차 기술적 포착:</b> ${screenerMatches.length}종목\n`;
  msg += `🗑️ <b>AI 필터링 탈락:</b> ${droppedStocks.length}종목\n`;
  msg += `🌟 <b>신규 AI 편입 승인 (High Conviction):</b> ${approvedStocks.length}종목\n\n`;
  
  if (approvedStocks.length > 0) {
    msg += `<b>[오늘의 신규 편입 종목]</b>\n`;
    approvedStocks.forEach((s) => {
      msg += `▪️ <b>${s.companyName}</b> (${s.ticker})\n`;
      msg += `  - 매수가: ${s.entryPrice.toLocaleString()}원\n`;
      msg += `  - 손절선: ${s.stopLossPrice.toLocaleString()}원\n`;
      msg += `  - 승률 예상: ${s.aiReport?.target_return_probability || 'N/A'}%\n\n`;
    });
  } else {
    msg += `<i>오늘은 AI 기준을 통과한 신규 알짜배기 종목이 없습니다.</i>\n\n`;
  }

  msg += `👉 <a href="http://localhost:3000/kr-portfolio">내 대시보드 확인하기</a>`;

  await sendTelegramMessage(msg);

  console.log('============================================');
  console.log('✅ 모든 파이프라인이 성공적으로 종료되었습니다.');
  console.log('============================================');
}

if (require.main === module) {
  runKrPipeline().catch(err => {
    console.error('파이프라인 실행 중 오류:', err);
  });
}
