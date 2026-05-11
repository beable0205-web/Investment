import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import fs from 'fs';
import { getStockData, calculateSMA } from '../src/lib/screener';
import { sendTelegramMessage, sendTelegramDocument } from '../src/lib/telegram';
import { getNaverCompanyData } from '../src/lib/data/naver_finance';
import { analyzeExitSignal } from '../src/lib/ai/fundamental';
import { generateHtmlSellReport } from '../src/lib/report_generator';

export async function runKrTrendFollowing() {
  console.log('============================================');
  console.log('📉 3단계: 한국 주식 트렌드 팔로잉(추세 감시) 봇 가동');
  console.log('============================================');

  const dbPath = path.join(process.cwd(), 'src', 'data', 'kr_tracked_stocks.json');
  if (!fs.existsSync(dbPath)) {
    console.log('추적 중인 주식 데이터 파일이 없습니다.');
    return;
  }

  const dbRaw = fs.readFileSync(dbPath, 'utf8');
  let db;
  try {
    db = JSON.parse(dbRaw);
  } catch (e) {
    console.error('JSON 파싱 에러:', e);
    return;
  }

  const stocks = db.stocks || [];
  if (stocks.length === 0) {
    console.log('현재 추적 중인 종목이 없습니다.');
    return;
  }

  console.log(`현재 ${stocks.length}개 종목을 모니터링 중입니다...`);

  let alertCount = 0;

  for (const stock of stocks) {
    if (stock.status !== 'TRACKING') continue;

    console.log(`\n[검사 중] ${stock.companyName} (${stock.ticker})`);
    
    try {
      const histData = await getStockData(stock.ticker, 40);
      if (!histData || histData.length < 20) {
        console.log(`데이터 부족으로 스킵: ${stock.ticker}`);
        continue;
      }

      const sma20 = calculateSMA(histData, 20);
      const volMA20 = calculateSMA(histData.map((d: any) => ({ close: d.volume })), 20);
      
      const lastIdx = histData.length - 1;
      const todayClose = histData[lastIdx].close;
      const todayOpen = histData[lastIdx].open;
      const todayVol = histData[lastIdx].volume;
      const prevClose = histData[lastIdx - 1].close;

      const currentSMA20 = sma20[lastIdx];
      const prevSMA20 = sma20[lastIdx - 1];
      const currentVolMA20 = volMA20[lastIdx];

      let shouldAlert = false;
      let alertReason = '';

      const entryPrice = stock.entryPrice || prevClose;
      const roi = ((todayClose - entryPrice) / entryPrice) * 100;
      
      stock.currentPrice = todayClose;
      stock.unrealizedROI = roi;

      let isTakeProfit = false;
      let isStopLoss = false;

      // 0. 익절 (목표가 도달) - 한 번 알림이 나갔으면(targetAlerted) 중복 알림 방지
      if (stock.targetPrice && todayClose >= stock.targetPrice && !stock.targetAlerted) {
        shouldAlert = true;
        isTakeProfit = true;
        alertReason = `🎉 목표가 도달! (+${roi.toFixed(2)}%) - AI 익절 판단 요청`;
      }
      // 1. 하드 스탑 (손절가 이탈)
      else if (stock.stopLossPrice && todayClose <= stock.stopLossPrice) {
        shouldAlert = true;
        isStopLoss = true;
        alertReason = `🛑 하드 스탑(손절가) 이탈! (${roi.toFixed(2)}%) - 기계적 손절 진행`;
      }

      if (shouldAlert) {
        console.log(`🚨 알림 발생: ${alertReason}...`);
        
        let aiReportText = '';
        let isFinalSell = isStopLoss; // 손절은 묻지도 따지지도 않고 기계적 매도(true)
        let aiAnalysis: any = null;
        let reportPath = '';

        try {
          // 익절, 손절 모두 쩐주(LP)에게 보고하기 위해 심층 분석 진행
          const companyData = await getNaverCompanyData(stock.ticker);
          if (companyData) {
            aiAnalysis = await analyzeExitSignal(companyData, alertReason);
            aiReportText = `\n\n🤖 <b>[AI 매도 심층 분석 리포트]</b>\n` +
              `▪️ <b>최종 판정:</b> ${aiAnalysis.final_decision}\n` +
              `▪️ <b>현재 상황:</b> ${aiAnalysis.company_status}\n` +
              `▪️ <b>액션 플랜:</b> ${aiAnalysis.action_plan}`;
            
            // 익절일 경우 중복 알림 방지
            if (isTakeProfit) {
              stock.targetAlerted = true;
            }
            
            const sellReportsPath = path.join(process.cwd(), 'src', 'data', 'archive', 'kr_sell_reports.json');
            let sellReports: any = { reports: [] };
            if (fs.existsSync(sellReportsPath)) {
              sellReports = JSON.parse(fs.readFileSync(sellReportsPath, 'utf8'));
            }
            sellReports.reports.push({
              ticker: stock.ticker,
              companyName: stock.companyName,
              date: new Date().toISOString(),
              alertReason,
              aiAnalysis,
              type: isStopLoss ? 'STOP_LOSS_ALERT' : 'TAKE_PROFIT_ALERT'
            });
            fs.writeFileSync(sellReportsPath, JSON.stringify(sellReports, null, 2));

            // HTML 문서 생성
            reportPath = generateHtmlSellReport(stock.companyName, stock.ticker, alertReason, aiAnalysis);
          }
        } catch (aiErr: any) {
          console.error('AI 분석 실패:', aiErr.message);
        }

        const msgType = isStopLoss ? '기계적 자동 손절' : '목표가 도달 보고';
        const msg = `🚨 <b>[${msgType}]</b> 🚨\n\n` +
          `🏢 <b>종목:</b> ${stock.companyName} (${stock.ticker})\n` +
          `📉 <b>현재가:</b> ${todayClose.toLocaleString()}원\n` +
          `💰 <b>확정/현재수익률:</b> ${roi.toFixed(2)}%\n` +
          `💔 <b>발생 사유:</b> ${alertReason}` +
          aiReportText +
          `\n\n👉 <a href="http://localhost:3000/kr-portfolio">시뮬레이션 대시보드 보기</a>`;
        
        // 텔레그램 문서 전송 (보고서가 생성된 경우), 실패하거나 없으면 일반 메시지 전송
        if (reportPath) {
          const caption = `[${msgType}] ${stock.companyName}\n\n수석 펀드매니저의 매도(청산) 심층 보고서가 도착했습니다. 첨부된 문서를 확인해주십시오.`;
          await sendTelegramDocument(reportPath, caption);
        } else {
          await sendTelegramMessage(msg);
        }
        
        alertCount++;
        
        // 손절(isFinalSell)일 경우에만 시뮬레이션 계좌에서 매도(SOLD) 처리
        if (isFinalSell) {
          stock.status = 'SOLD';
          stock.sellPrice = todayClose;
          stock.sellDate = new Date().toISOString();
          stock.realizedROI = roi;
          
          if (stock.shares && db.account) {
            const sellAmount = stock.shares * todayClose;
            const profit = sellAmount - (stock.investedAmount || 0);
            db.account.cash += sellAmount;
            db.account.totalRealizedProfit += profit;
            console.log(`[기계적 손절] ${stock.companyName} 전량 매도 완료. (매도대금: ${sellAmount.toLocaleString()}원 환입, 확정손익: ${profit.toLocaleString()}원)`);
          } else {
            console.log(`[기계적 손절] ${stock.companyName} 전량 매도 완료.`);
          }
        } else if (isTakeProfit) {
          console.log(`[익절 알림 완료] ${stock.companyName}은(는) 매도 처리하지 않고 대표님의 수동 익절을 대기합니다.`);
        }
      } else {
        console.log(`✅ 이상 없음. (현재가: ${todayClose})`);
      }

    } catch (e: any) {
      console.log(`${stock.companyName} 차트 데이터 조회 실패:`, e.message);
    }
  }

  // 상태(currentPrice 및 SOLD 여부) 저장
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

  console.log('============================================');
  console.log(`✅ 트렌드 팔로잉 검사 완료. (알림 발송: ${alertCount}건)`);
  console.log('============================================');
}

if (require.main === module || process.argv[1].endsWith('run_kr_trend_following.ts')) {
  runKrTrendFollowing().catch(err => {
    console.error('트렌드 러너 실행 중 오류 발생:', err);
  });
}
