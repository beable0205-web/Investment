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

// 3. 룰 기반 필터링 엔진 (단테 기법 정밀화)
export function evaluateRules(ticker: string, data: any[], companyName?: string) {
  if (!data || data.length < 224) return null;

  const closePrices = data.map(d => d.close);
  const volumes = data.map(d => d.volume);
  
  const sma20 = calculateSMA(data, 20);
  const sma60 = calculateSMA(data, 60);
  const sma112 = calculateSMA(data, 112);
  const sma224 = calculateSMA(data, 224);
  const env20 = calculateEnvelope(sma20, 20);
  const volMA20 = calculateSMA(data.map(d => ({ close: d.volume })), 20);

  const lastIdx = data.length - 1;
  const currentClose = closePrices[lastIdx];
  const currentVol = volumes[lastIdx];
  
  const currentSMA224 = sma224[lastIdx];
  const currentEnv20Lower = env20[lastIdx]?.lower;

  const matchReasons: string[] = [];

  // ---------------------------------------------------------
  // Rule 1: 밥그릇 3번 자리 (224일선 돌파 후 눌림목) + 공구리
  // ---------------------------------------------------------
  if (currentSMA224 !== null) {
    const diff224 = (currentClose - currentSMA224) / currentSMA224;
    
    // 1. 현재가가 224일선 근처에 위치 (눌림목 타점: -3% ~ +5%)
    if (diff224 >= -0.03 && diff224 <= 0.05) {
      
      // 2. 과거 1번, 2번 자리(장기 하락 및 횡보) 검증
      // 최근 6개월(120일) 동안 주가가 224일선 아래에 머문 기간이 최소 50% 이상이어야 '밥그릇 패턴' 성립
      let daysBelow224 = 0;
      for (let i = Math.max(0, lastIdx - 120); i < lastIdx - 20; i++) {
        if (closePrices[i] < sma224[i]!) daysBelow224++;
      }
      const isBowlPattern = daysBelow224 > 50;

      // 3. 최근 돌파 및 매집봉 확인 (세력 진입 흔적)
      let hasAccumulationCandle = false;
      let hasBreakout = false;
      
      for (let i = Math.max(0, lastIdx - 30); i <= lastIdx; i++) {
        const c = data[i];
        const v = volumes[i];
        const vMA = volMA20[i];
        const sma224AtI = sma224[i]!;
        
        // 돌파 확인: 종가가 224일선을 뚫고 올라갔었는가?
        if (c.close > sma224AtI * 1.02) hasBreakout = true;

        // 매집봉 확인: 거래량이 20일 평균의 3배 이상 터지고, 고가와 저가의 폭이 큰데 윗꼬리가 긴 양봉/음봉
        if (vMA && v > vMA * 3) {
          const body = Math.abs(c.close - c.open);
          const upperShadow = c.high - Math.max(c.close, c.open);
          const totalRange = c.high - c.low;
          // 윗꼬리가 몸통보다 길거나 캔들 전체 길이의 40% 이상 차지 (매물대 소화)
          if (upperShadow > body * 1.5 || upperShadow > totalRange * 0.4) {
            hasAccumulationCandle = true;
          }
        }
      }

      // 4. 공구리 (단기 지지선) 확인
      // 최근 10일간 주가가 특정 가격대에서 더 이상 빠지지 않고 3번 이상 지지받았는가?
      let supportBounces = 0;
      const recentLows = data.slice(lastIdx - 10, lastIdx + 1).map(d => d.low);
      const minLow = Math.min(...recentLows);
      for (const low of recentLows) {
        if (low <= minLow * 1.02) supportBounces++; // 최저점 대비 2% 이내에서 지지
      }
      const hasConcreteBase = supportBounces >= 3;

      if (isBowlPattern && hasBreakout && hasAccumulationCandle) {
        let reason = "Rule 1: 완벽한 밥그릇 3번 자리 포착 (장기 매집 후 224일선 돌파 및 눌림목, 강력한 매집봉 존재)";
        if (hasConcreteBase) reason += " + 단단한 공구리 지지선 확인됨";
        matchReasons.push(reason);
      }
    }
  }

  // ---------------------------------------------------------
  // Rule 2: 과대 낙폭 (엔벨롭 하단 터치) - 낙주 매매
  // ---------------------------------------------------------
  if (currentEnv20Lower !== null) {
    if (currentClose <= currentEnv20Lower * 1.02) { // 하단 2% 이내
      // 낙주 매매는 이격도가 클 때만 유효함 (20일선과 현재가의 괴리가 -15% 이상)
      const diff20 = (currentClose - sma20[lastIdx]!) / sma20[lastIdx]!;
      if (diff20 <= -0.15) {
        matchReasons.push("Rule 2: 엔벨롭(20, 20%) 하단 이탈 과대낙폭 (기술적 반등을 노리는 단기 V자 스윙 타점)");
      }
    }
  }

  // ---------------------------------------------------------
  // Rule 3: 역주행 캔들 (장대 양봉) - 영차 패턴 초입
  // ---------------------------------------------------------
  const prevClose = closePrices[lastIdx - 1];
  const prevOpen = data[lastIdx - 1].open;
  const currentOpen = data[lastIdx].open;
  
  if (prevClose < prevOpen && currentClose > currentOpen) {
    // 1. 전일 음봉 몸통을 완전히 장악 (장악형 캔들)
    if (currentClose > prevOpen && currentOpen <= prevClose) {
      // 2. 거래량이 전일 대비 2배 이상, 20일 평균 대비 2배 이상 폭발
      const vMA = volMA20[lastIdx];
      if (currentVol > volumes[lastIdx - 1] * 2 && vMA && currentVol > vMA * 2) {
        // 3. 20일선이 우상향 중이거나 돌파하는 자리 (하락 추세에서의 가짜 반등 방지)
        if (currentClose > sma20[lastIdx]!) {
          matchReasons.push("Rule 3: 거래량 폭발 전일 음봉 장악형 양봉 (세력의 강력한 추세 반전 및 영차 패턴 초입 캔들)");
        }
      }
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
