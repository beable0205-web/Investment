import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import * as cheerio from 'cheerio';

// Load .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// 우리가 쓸 자체 알고리즘 모듈
import { getStockData, evaluateRules } from '../src/lib/screener';

async function fetchUSMajorTickers() {
  console.log('미국 증시 우량주(S&P 500) 티커 리스트를 수집하는 중...');
  
  let allStocks: any[] = [];

  try {
    // 위키피디아 S&P 500 목록 크롤링 (가장 확실하고 무료인 방법)
    const res = await fetch('https://en.wikipedia.org/wiki/List_of_S%26P_500_companies');
    const html = await res.text();
    const $ = cheerio.load(html);

    $('#constituents tbody tr').each((i, row) => {
      if (i === 0) return; // 헤더 제외
      const columns = $(row).find('td');
      if (columns.length > 0) {
        let ticker = $(columns[0]).text().trim();
        // 위키피디아는 BRK.B 를 BRK.B 또는 BRK-B로 표기함. 야후 파이낸스는 BRK-B 사용.
        ticker = ticker.replace('.', '-');
        const name = $(columns[1]).text().trim();
        
        if (ticker) {
          allStocks.push({ ticker, name });
        }
      }
    });
    
    console.log(`총 ${allStocks.length}개의 S&P 500 미국 주식 티커를 로드했습니다.`);
  } catch (error) {
    console.error('S&P 500 티커 목록을 가져오는데 실패했습니다:', error);
    // 실패 시 예비용 하드코딩 티커 일부 사용
    allStocks = [
      { ticker: 'AAPL', name: 'Apple Inc.' },
      { ticker: 'MSFT', name: 'Microsoft' },
      { ticker: 'TSLA', name: 'Tesla' },
      { ticker: 'NVDA', name: 'Nvidia' },
      { ticker: 'AMZN', name: 'Amazon' }
    ];
  }

  return allStocks;
}

async function runDailyScreener() {
  console.log('============================================');
  console.log('🚀 미국 주요 종목(S&P 500) 백그라운드 스캐닝 시작...');
  console.log('============================================');

  // API Key 문제(FMP Legacy 에러)를 우회하기 위해 무료 퍼블릭 데이터(S&P 500) 스크래핑 사용
  const stocks = await fetchUSMajorTickers();
  const matchedStocks = [];
  const CHUNK_SIZE = 10; // Rate limit 방지를 위해 10개씩

  console.log(`OHLCV 데이터 검증 및 필터링 중... (최대 3~5분 소요 예상)`);
  let processed = 0;

  for (let i = 0; i < stocks.length; i += CHUNK_SIZE) {
    const chunk = stocks.slice(i, i + CHUNK_SIZE);
    
    const promises = chunk.map(async (stock) => {
      try {
        const data = await getStockData(stock.ticker, 500);
        if (data && data.length > 224) {
          const lastClose = data[data.length - 1].close;
          // [필터] 페니스탁(동전주) 제외: $5 이상인 종목만 타겟
          if (lastClose >= 5) {
            const matchResult = evaluateRules(stock.ticker, data, stock.name);
            return matchResult || null;
          }
        }
      } catch (e: any) {
        // 존재하지 않는 티커이거나 API 에러 조용히 무시
      }
      return null;
    });

    const results = await Promise.all(promises);
    results.forEach(res => {
      if (res) matchedStocks.push(res);
    });

    processed += chunk.length;
    // 진행 상황 출력
    if (processed % 50 === 0 || processed >= stocks.length) {
      console.log(`[진행 상황] ${Math.min(processed, stocks.length)} / ${stocks.length} 종목 스캔 완료... (현재 합격 종목: ${matchedStocks.length}개)`);
    }

    // 야후 파이낸스 차단 방지 (0.5초 대기)
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('============================================');
  console.log(`🎯 스캐닝 종료! 총 ${matchedStocks.length}개의 종목이 포착되었습니다.`);
  
  // 저장 디렉토리 확인 및 생성
  const saveDir = path.join(process.cwd(), 'src', 'data', 'archive');
  if (!fs.existsSync(saveDir)) {
    fs.mkdirSync(saveDir, { recursive: true });
  }

  const savePath = path.join(saveDir, 'daily_screener_matches.json');
  fs.writeFileSync(savePath, JSON.stringify({
    date: new Date().toISOString(),
    count: matchedStocks.length,
    matches: matchedStocks
  }, null, 2));

  console.log(`✅ 결과가 ${savePath} 에 저장되었습니다.`);
  console.log('이제 웹에서 [미국 주식 전 종목 스크리너] 버튼을 눌러 AI 리포트를 즉시 확인하세요!');
  console.log('============================================');
}

runDailyScreener().catch(err => {
  console.error('스캐너 실행 중 오류 발생:', err);
});
