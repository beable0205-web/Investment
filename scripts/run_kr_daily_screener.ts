import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import { getStockData, evaluateRules } from '../src/lib/screener';

async function fetchKRTickers() {
  console.log('한국 증시 (KOSPI/KOSDAQ) 티커 리스트를 로드하는 중...');
  
  const tickerPath = path.join(process.cwd(), 'src', 'data', 'kr_tickers.json');
  if (!fs.existsSync(tickerPath)) {
    console.error('kr_tickers.json 파일이 없습니다. 먼저 npm run fetch:kr 을 실행해주세요.');
    return [];
  }

  const rawData = fs.readFileSync(tickerPath, 'utf8');
  const allStocks = JSON.parse(rawData);
  console.log(`총 ${allStocks.length}개의 한국 주식 티커를 로드했습니다.`);
  return allStocks;
}

export async function runKRDailyScreener() {
  console.log('============================================');
  console.log('🚀 한국 주식 전 종목 백그라운드 스캐닝 시작...');
  console.log('============================================');

  const stocks = await fetchKRTickers();
  if (stocks.length === 0) return [];

  const matchedStocks: any[] = [];
  const CHUNK_SIZE = 10; // Rate limit 방지를 위해 10개씩 (야후 파이낸스는 너무 빠르면 차단됨)
  
  // For quick testing or partial scanning, we can limit the array
  // const testStocks = stocks.slice(0, 50); // limit to 50 for testing
  const targetStocks = stocks;
  console.log(`OHLCV 데이터 검증 및 필터링 중... (총 ${targetStocks.length}종목, 약 10~20분 소요 예상)`);
  let processed = 0;

  for (let i = 0; i < targetStocks.length; i += CHUNK_SIZE) {
    const chunk = targetStocks.slice(i, i + CHUNK_SIZE);
    
    const promises = chunk.map(async (stock: any) => {
      try {
        // 단테 기법은 최소 224일선이 필요하므로 여유있게 500 거래일 데이터 조회
        const data = await getStockData(stock.ticker, 500);
        if (data && data.length > 224) {
          const lastClose = data[data.length - 1].close;
          
          // [필터] 동전주(1000원 미만)는 변동성이 너무 크고 상장폐지 위험이 높으므로 제외
          // 단테 기법은 소형주에도 적용되지만, 최소한의 안정성을 위해 1000원 이상 필터
          if (lastClose >= 1000) {
            const matchResult = evaluateRules(stock.ticker, data, stock.name);
            return matchResult || null;
          }
        }
      } catch (e: any) {
        // 존재하지 않는 티커이거나 API 에러(상장폐지 등) 조용히 무시
      }
      return null;
    });

    const results = await Promise.all(promises);
    results.forEach(res => {
      if (res) matchedStocks.push(res);
    });

    processed += chunk.length;
    // 진행 상황 출력
    if (processed % 50 === 0 || processed >= targetStocks.length) {
      console.log(`[진행 상황] ${Math.min(processed, targetStocks.length)} / ${targetStocks.length} 종목 스캔 완료... (현재 타점 포착: ${matchedStocks.length}개)`);
    }

    // 야후 파이낸스 차단 방지 (0.5초 대기)
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('============================================');
  console.log(`🎯 스캐닝 종료! 총 ${matchedStocks.length}개의 종목이 타점에 포착되었습니다.`);
  
  // 저장 디렉토리 확인 및 생성
  const saveDir = path.join(process.cwd(), 'src', 'data', 'archive');
  if (!fs.existsSync(saveDir)) {
    fs.mkdirSync(saveDir, { recursive: true });
  }

  const savePath = path.join(saveDir, 'kr_daily_screener_matches.json');
  fs.writeFileSync(savePath, JSON.stringify({
    date: new Date().toISOString(),
    count: matchedStocks.length,
    matches: matchedStocks
  }, null, 2));

  console.log(`✅ 결과가 ${savePath} 에 저장되었습니다.`);
  console.log('============================================');
  return matchedStocks;
}

if (require.main === module || process.argv[1].endsWith('run_kr_daily_screener.ts')) {
  runKRDailyScreener().catch(err => {
    console.error('스캐너 실행 중 오류 발생:', err);
  });
}
