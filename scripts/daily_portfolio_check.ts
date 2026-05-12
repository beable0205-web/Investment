import { initPortfolio, dailySettlement } from '../src/lib/simulation';
import yahooFinancePkg from 'yahoo-finance2';
import * as dotenv from 'dotenv';
import path from 'path';

let yahooFinance = yahooFinancePkg;
if (yahooFinance && (yahooFinance as any).default) {
  yahooFinance = (yahooFinance as any).default;
}

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// Telegram Alert Function
async function sendTelegramMessage(message: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' })
    });
  } catch (err) {
    console.error('Telegram send error:', err);
  }
}

async function runDailyPortfolioCheck() {
  console.log('============================================');
  console.log('🛡️ 일일 포트폴리오 매도 조건 검사 시작');
  console.log('============================================');

  const p = initPortfolio();
  if (p.positions.length === 0) {
    console.log('보유 중인 종목이 없습니다. 검사를 종료합니다.');
    return;
  }

  const currentDate = new Date().toISOString().split('T')[0];
  const currentPrices: Record<string, number> = {};

  console.log('최신 주가 데이터 가져오는 중...');
  for (const pos of p.positions) {
    try {
      const quote = await (yahooFinance as any).quote(pos.ticker);
      if (quote && quote.regularMarketPrice) {
        currentPrices[pos.ticker] = quote.regularMarketPrice;
      }
    } catch (e: any) {
      console.warn(`[${pos.ticker}] 주가 가져오기 실패: ${e.message}`);
    }
  }

  const initialHistoryCount = p.history.length;

  // dailySettlement 안에서 손절/익절/타임스탑 조건에 걸리면 자동으로 history로 이동(매도)됨.
  const updatedPortfolio = dailySettlement(currentDate, currentPrices);

  const newSells = updatedPortfolio.history.length - initialHistoryCount;

  if (newSells > 0) {
    console.log(`\n🚨 총 ${newSells}개 종목이 매도(청산)되었습니다.`);
    
    // 방금 팔린 종목들 찾기
    const recentSells = updatedPortfolio.history.slice(-newSells);
    for (const sell of recentSells) {
      const msg = `
🚨 <b>[자동 매도 체결]</b>
- 종목명: ${sell.ticker}
- 매도가: $${sell.exitPrice.toFixed(2)}
- 수익률: ${sell.roi > 0 ? '+' : ''}${sell.roi.toFixed(2)}%
- 손익: $${sell.profit.toFixed(2)}
- 사유: ${sell.reason}
      `.trim();
      console.log(`[매도 완료] ${sell.ticker} / 사유: ${sell.reason}`);
      await sendTelegramMessage(msg);
    }
  } else {
    console.log('\n✅ 매도 조건에 도달한 종목이 없습니다. 전 종목 홀딩 유지!');
  }
  
  console.log('============================================');
  console.log('포트폴리오 검사 완료.');
}

runDailyPortfolioCheck().catch(console.error);
