import { getStockData, calculateSMA, calculateEnvelope } from './screener';

export interface BacktestTrade {
  entryDate: string;
  entryPrice: number;
  exitDate: string | null;
  exitPrice: number | null;
  rule: string;
  roi: number;
  status: 'OPEN' | 'CLOSED';
  exitReason?: string;
  hasCrossed20MA?: boolean;
}

export interface BacktestResult {
  ticker: string;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalReturn: number; // in %
  mdd: number; // in %
  trades: BacktestTrade[];
  equityCurve: { date: string; equity: number }[];
}

export async function runBacktest(ticker: string, periodDays: number = 1825): Promise<BacktestResult | null> {
  const data = await getStockData(ticker, periodDays);
  if (!data || data.length < 224) return null;

  const closePrices = data.map((d: any) => d.close);
  const volumes = data.map((d: any) => d.volume);
  const sma20 = calculateSMA(data, 20);
  const sma224 = calculateSMA(data, 224);
  const env20 = calculateEnvelope(sma20, 20);
  const volMA20 = calculateSMA(data.map((d: any) => ({ close: d.volume })), 20);

  const trades: BacktestTrade[] = [];
  let equity = 10000; // Start with $10,000
  const equityCurve: { date: string; equity: number }[] = [];
  
  const STOP_LOSS = -0.05;  // 하드 스탑 (최후 생명줄 -5%)

  let maxEquity = equity;
  let currentMDD = 0;

  for (let i = 224; i < data.length - 1; i++) {
    const currentClose = closePrices[i];
    const currentVol = volumes[i];
    const currentSMA20 = sma20[i];
    const currentVolMA20 = volMA20[i];

    // 1. 관리 중인 보유 종목(OPEN) 상태 업데이트 (매도 처리)
    for (const trade of trades.filter(t => t.status === 'OPEN')) {
      const currentRoi = (currentClose - trade.entryPrice) / trade.entryPrice;
      
      // 20일선 돌파 여부 추적
      if (!trade.hasCrossed20MA && currentSMA20 && currentClose >= currentSMA20) {
        trade.hasCrossed20MA = true;
      }
      
      let shouldExit = false;
      let exitReason = '';

      // 조건 0: 엔벨롭 타점의 경우, 20일선 저항 도달 시 즉시 익절
      if (trade.rule.includes('엔벨롭') && currentSMA20 && currentClose >= currentSMA20) {
        shouldExit = true;
        exitReason = '🎯 20일선 도달 (엔벨롭 익절)';
      }
      // 조건 1: 대량 거래량 장대음봉 (세력 이탈)
      // 거래량이 20일 평균의 3배 이상 터지고, 종가가 시가보다 낮으며(음봉), 고점일 때(수익권)
      else if (currentVolMA20 && currentVol > currentVolMA20 * 3 && currentClose < data[i].open && currentRoi > 0) {
        shouldExit = true;
        exitReason = '⚠️ 고점 대량 음봉 (세력 이탈)';
      }
      // 조건 2: 20일선 이탈 (추세 꺾임)
      // 매수 직후 20일선 아래에 있을 수 있으므로, 한 번이라도 20일선을 돌파한 적이 있을 때만 이탈을 인정
      else if (currentSMA20 && currentClose < currentSMA20 && trade.hasCrossed20MA) {
        shouldExit = true;
        exitReason = '🎯 추세 끝 (20일선 이탈)';
      }
      // 조건 3: 리스크 관리 하드 스탑 (-5%)
      else if (currentRoi <= STOP_LOSS) {
        shouldExit = true;
        exitReason = '🛑 리스크 관리 (하드 스탑 -5%)';
      }
      
      if (shouldExit) {
        trade.exitDate = data[i].date;
        trade.exitPrice = currentClose;
        trade.roi = currentRoi * 100;
        trade.status = 'CLOSED';
        trade.exitReason = exitReason;
        
        // 수익금 정산 (단순 누적, 복리 아님)
        equity += (10000 * currentRoi); 
      }
    }

    // 2. MDD 업데이트
    if (equity > maxEquity) maxEquity = equity;
    const mdd = (maxEquity - equity) / maxEquity * 100;
    if (mdd > currentMDD) currentMDD = mdd;

    equityCurve.push({ date: data[i].date, equity: equity });

    // 3. 신규 매수 조건 탐색
    // 매수 중복 방지 (이미 OPEN 상태인 타점 무시, 간단히 구현)
    if (trades.some(t => t.status === 'OPEN')) continue;

    const currentSMA224 = sma224[i];
    const currentEnv20Lower = env20[i]?.lower;
    
    let buySignal = false;
    let ruleName = '';

    // Rule 1: 224일선 눌림목
    if (currentSMA224 !== null) {
      const diff224 = (currentClose - currentSMA224) / currentSMA224;
      if (diff224 >= -0.02 && diff224 <= 0.05) {
        let hasVolumeSpike = false;
        for (let j = Math.max(0, i - 20); j <= i; j++) {
          if (volMA20[j] && volumes[j] > volMA20[j]! * 2.5) {
            hasVolumeSpike = true; break;
          }
        }
        if (hasVolumeSpike) { buySignal = true; ruleName = 'Rule 1: 224일선 눌림목'; }
      }
    }

    // Rule 2: 엔벨롭 하단 터치
    if (!buySignal && currentEnv20Lower !== null) {
      if (currentClose <= currentEnv20Lower * 1.03) {
        buySignal = true; ruleName = 'Rule 2: 엔벨롭 낙폭과대';
      }
    }

    // Rule 3: 역주행 캔들
    if (!buySignal) {
      const prevClose = closePrices[i - 1];
      const prevOpen = data[i - 1].open;
      const currentOpen = data[i].open;
      if (prevClose < prevOpen && currentClose > currentOpen) {
        if (currentClose > prevOpen && currentVol > volumes[i - 1] * 2) {
          buySignal = true; ruleName = 'Rule 3: 거래량 동반 역주행 양봉';
        }
      }
    }

    if (buySignal) {
      // 다음 날 시가에 매수한다고 가정
      trades.push({
        entryDate: data[i + 1].date,
        entryPrice: data[i + 1].open,
        exitDate: null,
        exitPrice: null,
        rule: ruleName,
        roi: 0,
        status: 'OPEN'
      });
    }
  }

  // 마지막 날 강제 청산
  for (const trade of trades.filter(t => t.status === 'OPEN')) {
    trade.exitDate = data[data.length - 1].date;
    const finalClose = data[data.length - 1].close;
    trade.exitPrice = finalClose;
    trade.roi = ((finalClose - trade.entryPrice) / trade.entryPrice) * 100;
    trade.status = 'CLOSED';
    trade.exitReason = '🔚 시뮬레이션 종료 (강제 청산)';
    equity += (10000 * (trade.roi / 100));
  }
  
  equityCurve.push({ date: data[data.length - 1].date, equity: equity });

  const closedTrades = trades.filter(t => t.status === 'CLOSED');
  const winningTrades = closedTrades.filter(t => t.roi > 0).length;
  const losingTrades = closedTrades.length - winningTrades;
  const winRate = closedTrades.length > 0 ? (winningTrades / closedTrades.length) * 100 : 0;
  const totalReturn = ((equity - 10000) / 10000) * 100;

  return {
    ticker,
    totalTrades: closedTrades.length,
    winningTrades,
    losingTrades,
    winRate,
    totalReturn,
    mdd: currentMDD,
    trades: closedTrades,
    equityCurve
  };
}
