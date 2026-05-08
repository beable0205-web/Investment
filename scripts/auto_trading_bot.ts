import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { getUSAccountBalance, placeUSOrder } from '../src/lib/broker/kisApi';
import { sendTelegramMessage } from '../src/lib/telegram';
import { getStockData, calculateSMA } from '../src/lib/screener';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// 설정 값
const STOP_LOSS_PCT = -5;   // -5% 하드 스탑 (최후 생명줄)
const ALLOCATE_PCT_PER_STOCK = 10; // 종목당 예수금의 10% 비중 투자

export async function runAutoTrading() {
  console.log('============================================');
  console.log('🤖 [무인 퀀트 봇] 실전 자동 매매 프로세스 시작...');
  console.log(`- 모의투자 여부: ${process.env.KIS_IS_MOCK === 'true' ? 'YES (Paper Trading)' : 'NO (REAL MONEY)'}`);
  console.log('============================================');

  try {
    // 1. 계좌 잔고 및 보유 종목 조회
    const accountInfo = await getUSAccountBalance();
    
    if (accountInfo.rt_cd !== '0') {
      throw new Error(`계좌 조회 실패: ${accountInfo.msg1}`);
    }

    // 외화 예수금 (달러)
    const usdBalance = parseFloat(accountInfo.output2.frcr_evlu_amt2 || '0');
    const holdings = accountInfo.output1 || []; // 보유 종목 리스트

    console.log(`💰 현재 계좌 달러 예수금: $${usdBalance.toFixed(2)}`);

    // 2. [매도 로직] 보유 종목 중 익절/손절선 도달 체크
    let soldCount = 0;
    for (const holding of holdings) {
      const ticker = holding.pdno; // 종목코드
      const qty = parseInt(holding.ccld_qty_smtl1 || '0'); // 보유 수량
      const avgPrice = parseFloat(holding.pchs_avg_pric || '0'); // 매입 평균가
      const currentPrice = parseFloat(holding.prpr || '0'); // 현재가
      
      if (qty === 0 || avgPrice === 0) continue;

      const roi = ((currentPrice - avgPrice) / avgPrice) * 100;
      
      let shouldSell = false;
      let reason = '';

      // 동적 추세 추종 (Dynamic Trend Following) 매도 로직
      // 해당 종목의 최근 일봉 데이터를 가져와 20일선 및 대량 거래 음봉 체크
      try {
        const histData = await getStockData(ticker, 40); // 최근 40일 데이터만 가져옴
        if (histData && histData.length >= 20) {
          const sma20 = calculateSMA(histData, 20);
          const volMA20 = calculateSMA(histData.map((d: any) => ({ close: d.volume })), 20);
          
          const lastIdx = histData.length - 1;
          const todayClose = histData[lastIdx].close;
          const todayOpen = histData[lastIdx].open;
          const todayVol = histData[lastIdx].volume;
          
          const currentSMA20 = sma20[lastIdx];
          const currentVolMA20 = volMA20[lastIdx];

          const prevClose = histData[lastIdx - 1].close;
          const prevSMA20 = sma20[lastIdx - 1];

          // 1. 대량 거래량 장대음봉 (세력 이탈)
          if (currentVolMA20 && todayVol > currentVolMA20 * 3 && todayClose < todayOpen && roi > 0) {
            shouldSell = true;
            reason = `⚠️ 고점 대량 음봉 (세력 이탈 감지, 수익률: ${roi.toFixed(2)}%)`;
          }
          // 2. 20일선 이탈 (추세 꺾임) - 어제는 20일선 위였는데 오늘 깨졌을 때만 (데드크로스)
          else if (currentSMA20 && prevSMA20 && prevClose >= prevSMA20 && todayClose < currentSMA20) {
            shouldSell = true;
            reason = `🎯 추세 끝 20일선 데드크로스 (수익률: ${roi.toFixed(2)}%)`;
          }
          // 조건 0: (엔벨롭용) 20일선 아래에서 샀는데 20일선 위로 올라왔을 때 (골든크로스 익절)
          else if (currentSMA20 && prevSMA20 && prevClose < prevSMA20 && todayClose >= currentSMA20 && roi > 0) {
            shouldSell = true;
            reason = `🎯 20일선 저항 돌파/도달 익절 (수익률: ${roi.toFixed(2)}%)`;
          }
        }
      } catch (err) {
        console.error(`[${ticker}] 차트 데이터 조회 실패, 하드 스탑만 적용합니다.`);
      }

      // 3. 리스크 관리 하드 스탑 (-5%)
      if (!shouldSell && roi <= STOP_LOSS_PCT) {
        shouldSell = true;
        reason = `🛑 하드 스탑 도달 (${roi.toFixed(2)}%)`;
      }

      if (shouldSell) {
        console.log(`[매도 발생] ${ticker} | 사유: ${reason}`);
        // 전량 지정가 매도 (미국 시장가 매도는 제약이 있어 현재가로 지정가 매도)
        const orderRes = await placeUSOrder(ticker, currentPrice, qty, false);
        
        if (orderRes.rt_cd === '0') {
          soldCount++;
          await sendTelegramMessage(`🤖 <b>[자동 매도 체결]</b>\n종목: ${ticker}\n사유: ${reason}\n수량: ${qty}주\n단가: $${currentPrice}`);
        } else {
          console.error(`매도 주문 실패 [${ticker}]: ${orderRes.msg1}`);
        }
      }
    }

    // 3. [매수 로직] 오늘 포착된 스크리닝 종목 매수
    const matchesPath = path.join(process.cwd(), 'src', 'data', 'archive', 'daily_screener_matches.json');
    if (!fs.existsSync(matchesPath)) {
      console.log('오늘 포착된 스크리닝 결과가 없습니다. 매수 로직을 건너뜁니다.');
      return;
    }

    const { matches } = JSON.parse(fs.readFileSync(matchesPath, 'utf-8'));
    
    if (matches.length > 0) {
      console.log(`🎯 오늘 포착된 매수 대상 종목: ${matches.length}개`);
      
      // 예수금의 10%씩 매수
      const targetAmountPerStock = usdBalance * (ALLOCATE_PCT_PER_STOCK / 100);

      for (const match of matches) {
        const ticker = match.ticker;
        const currentPrice = match.close;

        // 이미 보유 중인 종목인지 확인 (중복 매수 방지)
        const alreadyHolding = holdings.some((h: any) => h.pdno === ticker && parseInt(h.ccld_qty_smtl1) > 0);
        if (alreadyHolding) {
          console.log(`[매수 패스] ${ticker}는 이미 보유 중입니다.`);
          continue;
        }

        const qtyToBuy = Math.floor(targetAmountPerStock / currentPrice);
        
        if (qtyToBuy > 0) {
          console.log(`[매수 주문] ${ticker} | 목표금액: $${targetAmountPerStock.toFixed(2)} | 수량: ${qtyToBuy}주`);
          const orderRes = await placeUSOrder(ticker, currentPrice, qtyToBuy, true);

          if (orderRes.rt_cd === '0') {
            await sendTelegramMessage(`🤖 <b>[자동 매수 체결]</b>\n종목: ${ticker}\n조건: 퀀트 알고리즘 포착\n수량: ${qtyToBuy}주\n단가: $${currentPrice}`);
          } else {
            console.error(`매수 주문 실패 [${ticker}]: ${orderRes.msg1}`);
          }
        }
      }
    }

    console.log('============================================');
    console.log('✅ 오늘자 퀀트 자동 매매(리밸런싱) 완료!');
    
  } catch (err) {
    console.error('자동 매매 중 치명적 오류 발생:', err);
    await sendTelegramMessage(`⚠️ <b>[자동 매매 에러 발생]</b>\n봇 실행 중 오류가 발생했습니다. 로그를 확인하세요.`);
  }
}

// 직접 실행 시
if (require.main === module) {
  runAutoTrading().catch(console.error);
}
