let yahooFinance: any;
try {
  yahooFinance = require('yahoo-finance2').default;
  if (typeof yahooFinance === 'function') {
    yahooFinance = new yahooFinance();
  }
} catch (e) {
  yahooFinance = require('yahoo-finance2');
}

// 1. 지표 계산 함수 (Indicators)
export function calculateSMA(data: any[], period: number, key: string = 'close') {
  const result = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
      continue;
    }
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j][key];
    }
    result.push(sum / period);
  }
  return result;
}

export function calculateEnvelope(smaData: (number | null)[], percent: number = 20) {
  return smaData.map(val => {
    if (val === null) return { upper: null, mid: null, lower: null };
    return {
      upper: val * (1 + percent / 100),
      mid: val,
      lower: val * (1 - percent / 100)
    };
  });
}

// 2. 야후 파이낸스 데이터 패치
export async function getStockData(ticker: string, periodDays: number = 500) {
  try {
    const d = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split('T')[0]; // format as YYYY-MM-DD
    const queryOptions = { 
      period1: dateStr,
      period2: new Date() 
    };
    const result = await yahooFinance.historical(ticker, queryOptions as any);
    return result; // Array of { date, open, high, low, close, volume }
  } catch (err) {
    console.error(`Failed to fetch ${ticker}:`, err);
    return null;
  }
}

// 3. 룰 기반 필터링 엔진
export function evaluateRules(ticker: string, data: any[], companyName?: string) {
  if (!data || data.length < 224) return null;

  const closePrices = data.map(d => d.close);
  const volumes = data.map(d => d.volume);
  
  const sma20 = calculateSMA(data, 20);
  const sma60 = calculateSMA(data, 60);
  const sma112 = calculateSMA(data, 112);
  const sma224 = calculateSMA(data, 224);
  const sma448 = calculateSMA(data, 448);
  const env20 = calculateEnvelope(sma20, 20);

  const lastIdx = data.length - 1;
  const currentClose = closePrices[lastIdx];
  const currentVol = volumes[lastIdx];
  
  const currentSMA20 = sma20[lastIdx];
  const currentSMA60 = sma60[lastIdx];
  const currentSMA112 = sma112[lastIdx];
  const currentSMA224 = sma224[lastIdx];
  const currentEnv20Lower = env20[lastIdx]?.lower;

  const matchReasons: string[] = [];

  // 공통: 최근 20일 평균 거래대금 계산 (종가 * 거래량)
  const volMA20 = calculateSMA(data.map(d => ({ close: d.volume })), 20);
  const currentVolMA20 = volMA20[lastIdx];
  if (!currentVolMA20) return null;

  // [기본 필터] 평균 거래대금이 최소 10억(1,000,000,000) 이상인 종목만 취급 (초소형 잡주 배제)
  const avgTradingValue = currentVolMA20 * currentClose;
  if (avgTradingValue < 1000000000) return null;

  // [기본 필터] 동전주(1000원 미만) 배제
  if (currentClose < 1000) return null;

  // Rule 1: 밥그릇 3번 자리 (224일선 돌파/안착)
  if (currentSMA224 !== null && data.length >= 224) {
    // 224일선 부근(-5% ~ +8%)이면서 장기 횡보 후 거래량 폭발
    const diff224 = (currentClose - currentSMA224) / currentSMA224;
    
    // 조건 1: 최근 주가가 224일선 돌파 직전이거나 안착한 상태 (-5% ~ +8%)
    if (diff224 >= -0.05 && diff224 <= 0.08) {
      let hasVolumeSpike = false;
      // 매집봉은 20일 거래량 평균의 최소 2.5배 이상이어야 함 (조건 완화)
      for (let i = Math.max(0, lastIdx - 20); i <= lastIdx; i++) {
        if (volMA20[i] && volumes[i] > volMA20[i]! * 2.5) {
          hasVolumeSpike = true;
          break;
        }
      }
      
      // 조건 2: 과거 6개월~1년 전 주가가 224일선 아래에서 횡보했는가 (밥그릇 1,2번)
      const pastIdx = Math.max(0, lastIdx - 120);
      const pastClose = closePrices[pastIdx];
      const isBottoming = pastClose < currentSMA224 * 1.10; 

      if (hasVolumeSpike && isBottoming) {
        matchReasons.push("Rule 1: 224일선 안착 및 250% 이상 강력한 매집봉 포착 (밥그릇 3번 자리 초기)");
      }
    }
  }

  // Rule 2: 256 기법 (정배열 초입, 20일/60일선이 112/224일선 골든크로스)
  if (currentSMA20 !== null && currentSMA60 !== null && currentSMA112 !== null && currentSMA224 !== null) {
    // 단기 이평선이 우상향
    const isShortTermUp = currentSMA20 > sma20[lastIdx - 5]! && currentSMA60 > sma60[lastIdx - 5]!;
    // 밀집도 4% 이내로 모인 상태 (조건 완화)
    const isConverging = Math.abs(currentSMA20 - currentSMA112) / currentSMA112 < 0.04 || 
                         Math.abs(currentSMA60 - currentSMA224) / currentSMA224 < 0.04;
    const isAboveLongTerm = currentClose > currentSMA112 && currentClose > currentSMA224;

    if (isShortTermUp && isConverging && isAboveLongTerm) {
      // 최근 10일 이내 의미 있는 양봉 (거래량 1.5배 이상)
      let recentBullish = false;
      for (let i = lastIdx - 10; i <= lastIdx; i++) {
        if (closePrices[i] > data[i].open && volumes[i] > volMA20[i]! * 1.5) {
          recentBullish = true;
          break;
        }
      }
      if (recentBullish) {
        matchReasons.push("Rule 2: 이평선 밀집(4% 이내) 및 우상향 (256 기법 정배열 초입)");
      }
    }
  }

  // Rule 3: 공구리 기법 (바닥권 대량 거래량 장대양봉 후 지지)
  if (data.length >= 60) {
    let baseCandleIdx = -1;
    // 최근 15일 이내에 거래량이 3배 이상 터진 8% 이상 장대양봉(확실한 기준봉)
    for (let i = lastIdx - 15; i < lastIdx - 2; i++) {
      if (volumes[i] > volMA20[i]! * 3 && closePrices[i] > data[i].open * 1.08) {
        baseCandleIdx = i;
        break;
      }
    }

    if (baseCandleIdx !== -1) {
      const baseCandleOpen = data[baseCandleIdx].open;
      const baseCandleClose = closePrices[baseCandleIdx];
      
      // 시가를 종가상으로 거의 깨지 않아야 함 (2% 언더슈팅 허용)
      let isSupported = true;
      for (let j = baseCandleIdx + 1; j <= lastIdx; j++) {
        if (closePrices[j] < baseCandleOpen * 0.98) {
          isSupported = false;
          break;
        }
      }

      // 현재가가 기준봉 시가 부근(시가-1% ~ 시가+5%)에 바짝 붙어있어 손절이 매우 짧은 타점
      if (isSupported && currentClose >= baseCandleOpen * 0.99 && currentClose <= baseCandleOpen * 1.05) {
        matchReasons.push(`Rule 3: 공구리 기법 지지 (기준봉 시가 부근 최적 타점)`);
      }
    }
  }

  // Rule 4: 과대 낙폭 (엔벨롭 20, 20 하단 완전 이탈 또는 터치)
  if (currentEnv20Lower !== null) {
    if (currentClose <= currentEnv20Lower * 1.01) { // 엔벨롭 하단 1% 이내 또는 하향 돌파
      matchReasons.push("Rule 4: 엔벨롭(20, 20%) 하단 완전 터치 (극단적 과대낙폭, 기술적 반등 타점)");
    }
  }

  if (matchReasons.length > 0) {
    return {
      ticker,
      companyName: companyName || ticker,
      date: data[lastIdx].date,
      close: currentClose,
      matchReasons,
      dataSample: data.slice(-5)
    };
  }

  return null;
}
