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

export async function runDailyScreener() {
  console.log('============================================');
  console.log('🚀 미국 주요 종목(S&P 500) 백그라운드 스캐닝 시작...');
  console.log('============================================');

  // API Key 문제(FMP Legacy 에러)를 우회하기 위해 무료 퍼블릭 데이터(S&P 500) 스크래핑 사용
  const stocks = await fetchUSMajorTickers();
  const matchedStocks: any[] = [];
  const CHUNK_SIZE = 10; // Rate limit 방지를 위해 10개씩

  console.log(`OHLCV 데이터 검증 및 필터링 중... (최대 3~5분 소요 예상)`);
  let processed = 0;

  // ----------------------------------------------------
  // 1. 연간 중복 추천 방지 (1-Year Cooldown) 로직
  // ----------------------------------------------------
  const currentYear = new Date().getFullYear();
  const cooldownPath = path.join(process.cwd(), 'src', 'data', 'archive', 'cooldown_list.json');
  let cooldownList: Record<string, number> = {}; // { "AAPL": 2026 }
  if (fs.existsSync(cooldownPath)) {
    cooldownList = JSON.parse(fs.readFileSync(cooldownPath, 'utf-8'));
  }

  for (let i = 0; i < stocks.length; i += CHUNK_SIZE) {
    const chunk = stocks.slice(i, i + CHUNK_SIZE);
    
    const promises = chunk.map(async (stock) => {
      // 쿨다운(올해 이미 추천됨) 확인
      if (cooldownList[stock.ticker] === currentYear) {
        return null; // 올해 이미 픽된 종목은 스킵
      }

      try {
        const data = await getStockData(stock.ticker, 500);
        if (data && data.length > 224) {
          const lastClose = data[data.length - 1].close;
          // [필터] 페니스탁(동전주) 제외: $5 이상인 종목만 타겟
          if (lastClose >= 5) {
            const matchResult = evaluateRules(stock.ticker, data, stock.name);
            if (matchResult) {
              // ----------------------------------------------------
              // 2. 펀더멘털 AI 크로스 체크 (더블 체크 로직)
              // ----------------------------------------------------
              const fundamentalPath = path.join(process.cwd(), 'src', 'data', 'fundamentals', `${stock.ticker}.json`);
              if (fs.existsSync(fundamentalPath)) {
                const fundamentalData = JSON.parse(fs.readFileSync(fundamentalPath, 'utf-8'));
                const tags = fundamentalData.analysis?.ai_system_tags || [];
                const traits = fundamentalData.analysis?.fundamental_traits || {};
                const profitability = traits.profitability || '';
                
                // 1. 자본잠식(상장폐지 위험)은 미래 불문하고 무조건 컷
                if (profitability.includes('자본잠식') || tags.includes('Bankruptcy Risk')) {
                  console.log(`\n🚫 [상장폐지 위험 컷] ${stock.ticker}: 차트 타점 발견했으나 자본잠식 상태로 거절됨.`);
                  return null;
                }
                
                // 2. 적자 기업이라도 '턴어라운드'나 '초고속 성장' 모멘텀이 있으면 통과! (고객님 로직 반영)
                // 단, 적자인데 미래 전망(태그)조차 없으면 컷
                if (profitability.includes('적자 늪') && !tags.includes('Turnaround') && !tags.includes('High-Growth')) {
                  console.log(`\n🚫 [만년 적자 컷] ${stock.ticker}: 적자 기업이며 턴어라운드/고성장 기대감조차 없어 거절됨.`);
                  return null;
                }
              }
              return matchResult;
            }
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
  console.log(`🎯 월간 스캐닝 종료! 총 ${matchedStocks.length}개의 종목이 포착되었습니다.`);
  
  // 저장 디렉토리 확인 및 생성
  const saveDir = path.join(process.cwd(), 'src', 'data', 'archive');
  if (!fs.existsSync(saveDir)) {
    fs.mkdirSync(saveDir, { recursive: true });
  }

  // 쿨다운 DB 업데이트 (올해 추천된 종목 기록)
  matchedStocks.forEach(s => {
    cooldownList[s.ticker] = currentYear;
  });
  fs.writeFileSync(cooldownPath, JSON.stringify(cooldownList, null, 2));
  console.log(`🔒 ${matchedStocks.length}개 종목이 올해 추천 금지 목록(Cooldown)에 추가되었습니다.`);

  const savePath = path.join(saveDir, 'monthly_screener_matches.json');
  fs.writeFileSync(savePath, JSON.stringify({
    date: new Date().toISOString(),
    count: matchedStocks.length,
    matches: matchedStocks
  }, null, 2));

  console.log(`✅ 스크리닝 결과가 ${savePath} 에 저장되었습니다.`);

  // ----------------------------------------------------
  // 모의투자(Paper Trading) 시뮬레이션 연동
  // ----------------------------------------------------
  console.log('============================================');
  console.log('🤖 모의투자 시뮬레이션 체결 진행 중...');
  
  // 1. 오늘 날짜와 현재가 맵 생성
  const currentDate = new Date().toISOString().split('T')[0];
  const currentPrices: Record<string, number> = {};
  
  // 전체 스캔했던 종목들 중 현재가 추출 (스크리너 결과 활용)
  matchedStocks.forEach(s => {
    currentPrices[s.ticker] = s.close;
  });
  
  // 보유 종목들 현재가 업데이트를 위해 API 한번 더 호출 (실제 운영 시 최적화 필요)
  // 여기서는 단순히 모의투자 로직 호출
  const { initPortfolio, dailySettlement, executeBuy, savePortfolio } = await import('../src/lib/simulation');
  
  // 기존 보유 종목 정산 (손절/익절 처리)
  const portfolio = dailySettlement(currentDate, currentPrices);
  
  // 신규 타점 매수 체결
  let buyCount = 0;
  for (const match of matchedStocks) {
    // 밥그릇 3번 자리(Rule 1)만 우선 매수하는 보수적 접근
    if (match.matchReasons.some((r: string) => r.includes('Rule 1'))) {
      const success = executeBuy(portfolio, match.ticker, match.companyName, match.close, match.matchReasons[0], match.date);
      if (success) {
        console.log(`[체결] ${match.ticker} (${match.companyName}) 매수 완료! 단가: $${match.close}`);
        buyCount++;
      }
    }
  }
  
  savePortfolio(portfolio);
  console.log(`✅ 일일 정산 완료: ${buyCount}개 종목 신규 매수됨. 현재 가용 예수금: $${portfolio.cash.toFixed(2)}`);

  console.log('이제 웹에서 [모의투자 대시보드] 메뉴를 눌러 포트폴리오를 확인하세요!');
  console.log('============================================');
  return matchedStocks;
}

if (require.main === module || process.argv[1].endsWith('run_daily_screener.ts')) {
  runDailyScreener().catch(err => {
    console.error('스캐너 실행 중 오류 발생:', err);
  });
}
