import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import * as cheerio from 'cheerio';
import { runBacktest, BacktestResult } from '../src/lib/backtest';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const DELAY_MS = 300; // API 호출 간격 (야후 파이낸스 차단 방지)

// 딜레이 헬퍼
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchAllUSTickers() {
  console.log('미국 증시 전 종목(SEC 등록 기준) 티커 리스트를 수집하는 중...');
  try {
    const res = await fetch('https://www.sec.gov/files/company_tickers.json', {
      headers: { 'User-Agent': 'InvestmentAIMentor contact@example.com' }
    });
    const data: any = await res.json();
    const allStocks: { ticker: string; name: string }[] = Object.values(data).map((item: any) => ({
      ticker: item.ticker.replace('.', '-'),
      name: item.title
    }));
    console.log(`총 ${allStocks.length}개의 미국 주식 티커를 로드했습니다.`);
    return allStocks;
  } catch (error) {
    console.error('티커 목록 수집 실패:', error);
    return [];
  }
}

// 청크 단위 실행을 위한 헬퍼 (병렬 처리)
async function processInChunks<T, R>(items: T[], chunkSize: number, processor: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const chunkPromises = chunk.map((item, idx) => processor(item, i + idx));
    const chunkResults = await Promise.all(chunkPromises);
    results.push(...chunkResults);
    
    // 진행 상황 출력
    console.log(`진행률: ${Math.min(i + chunkSize, items.length)} / ${items.length} 완료...`);
    
    // 야후 파이낸스 차단 방지용 딜레이 (청크당 1초)
    await delay(1000);
  }
  return results;
}

async function runGlobalBacktest() {
  console.log('============================================');
  console.log('🌍 [글로벌 백테스트] S&P 500 전 종목 5년치 시뮬레이션 시작');
  console.log('============================================');

  const stocks = await fetchAllUSTickers();
  if (stocks.length === 0) {
    console.error('종목을 불러오지 못해 백테스트를 종료합니다.');
    return;
  }

  const results: (BacktestResult & { name: string })[] = [];
  const errors: string[] = [];

  // 10개씩 병렬 처리 (속도 향상 및 차단 방지)
  await processInChunks(stocks, 10, async (stock, index) => {
    const { ticker, name } = stock;
    try {
      const result = await runBacktest(ticker, 1825); // 5년 (1825일)
      if (result) {
        results.push({ ...result, name });
      }
    } catch (e: any) {
      errors.push(ticker);
    }
    return null;
  });

  console.log('\n============================================');
  console.log('✅ 전 종목 시뮬레이션 완료. 결과 정렬 및 저장 중...');
  
  // 승률(winRate)이 같으면 총수익률(totalReturn) 높은 순으로 내림차순 정렬
  results.sort((a, b) => {
    if (b.winRate === a.winRate) {
      return b.totalReturn - a.totalReturn;
    }
    return b.winRate - a.winRate;
  });

  const outputData = {
    updatedAt: new Date().toISOString(),
    totalAnalyzed: results.length,
    failedTickers: errors,
    results: results.map(r => ({
      ticker: r.ticker,
      name: r.name,
      totalTrades: r.totalTrades,
      winningTrades: r.winningTrades,
      losingTrades: r.losingTrades,
      winRate: r.winRate,
      totalReturn: r.totalReturn,
      mdd: r.mdd
      // trades와 equityCurve는 용량이 너무 커지므로 랭킹 JSON에서는 제외
    }))
  };

  const dirPath = path.join(process.cwd(), 'src', 'data', 'archive');
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  const filePath = path.join(dirPath, 'top_backtested.json');
  fs.writeFileSync(filePath, JSON.stringify(outputData, null, 2), 'utf-8');

  console.log(`💾 랭킹 데이터 저장 완료: ${filePath}`);
  console.log(`수집 성공: ${results.length}종목 | 실패: ${errors.length}종목`);
  console.log('============================================');
}

// 스크립트 직접 실행 시
if (require.main === module) {
  runGlobalBacktest().catch(console.error);
}
