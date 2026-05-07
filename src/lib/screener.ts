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
  const sma224 = calculateSMA(data, 224);
  const env20 = calculateEnvelope(sma20, 20);

  const lastIdx = data.length - 1;
  const currentClose = closePrices[lastIdx];
  const currentVol = volumes[lastIdx];
  
  const currentSMA224 = sma224[lastIdx];
  const currentEnv20Lower = env20[lastIdx]?.lower;

  const matchReasons: string[] = [];

  // Rule 1: 밥그릇 3번 자리 & 224일선 눌림목
  if (currentSMA224 !== null) {
    // 현재가가 224일선 부근에 위치 (-2% ~ +5%)
    const diff224 = (currentClose - currentSMA224) / currentSMA224;
    if (diff224 >= -0.02 && diff224 <= 0.05) {
      // 최근 20일 내 대량 거래량(매집봉)이 있었는지 판단
      let hasVolumeSpike = false;
      const volMA20 = calculateSMA(data.map(d => ({ close: d.volume })), 20);
      for (let i = Math.max(0, lastIdx - 20); i <= lastIdx; i++) {
        if (volMA20[i] && volumes[i] > volMA20[i]! * 2.5) {
          hasVolumeSpike = true;
          break;
        }
      }
      if (hasVolumeSpike) {
        matchReasons.push("Rule 1: 224일선 부근 눌림목 및 강력한 거래량(매집봉) 포착 (대시세 초입 가능성 높은 밥그릇 3번 자리)");
      }
    }
  }

  // Rule 2: 과대 낙폭 (엔벨롭 하단 터치)
  if (currentEnv20Lower !== null) {
    if (currentClose <= currentEnv20Lower * 1.03) { // 엔벨롭 하단 3% 이내 접근
      matchReasons.push("Rule 2: 엔벨롭(20, 20%) 하단 터치 임박 (기관/외인 프로그램 매수 유입을 기대하는 극단적 과대낙폭 타점)");
    }
  }

  // Rule 3: 역주행 캔들 (장대 양봉)
  const prevClose = closePrices[lastIdx - 1];
  const prevOpen = data[lastIdx - 1].open;
  const currentOpen = data[lastIdx].open;
  
  // 어제 음봉이고 오늘 양봉이면서 전일 음봉 몸통을 완전히 장악한 거래량 폭발 양봉
  if (prevClose < prevOpen && currentClose > currentOpen) {
    if (currentClose > prevOpen && currentVol > volumes[lastIdx - 1] * 2) {
      matchReasons.push("Rule 3: 전일 음봉을 압도하는 거래량 동반 장대 양봉 발생 (추세 반전의 강력한 역주행 캔들 시그널)");
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
