import YahooFinance from 'yahoo-finance2';

const yahooFinance = new (YahooFinance as any)();

export async function getETFData() {
  const tickers = ['XLK', 'XLV', 'XLE', 'XLF', 'XLI', 'XLY', 'XLP'];
  const results: Record<string, any> = {};

  try {
    for (const ticker of tickers) {
      const quote = await yahooFinance.quote(ticker) as any;
      
      const period1 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const chartResult = await yahooFinance.chart(ticker, { period1 } as any);
      const history = chartResult.quotes;
      
      const closes = history.map((h: any) => h.close).filter(Boolean).slice(-20);
      const sma20 = closes.reduce((a: number, b: number) => a + b, 0) / closes.length;

      results[ticker] = {
        price: quote.regularMarketPrice,
        changePercent: quote.regularMarketChangePercent,
        sma20: Number(sma20.toFixed(2)),
      };
    }
    return results;
  } catch (error) {
    console.error('Failed to fetch Yahoo Finance data:', error);
    throw error;
  }
}

export async function getUSNews() {
  try {
    // Search for general market news using SPY as a proxy for the US market
    const searchResult = await yahooFinance.search('SPY', { newsCount: 5 }) as any;
    return searchResult.news.map((item: any) => ({
      title: item.title,
      link: item.link,
      publisher: item.publisher,
      providerPublishTime: item.providerPublishTime
    }));
  } catch (error) {
    console.error('Failed to fetch US news:', error);
    return [];
  }
}

export async function getCompanyDeepData(ticker: string) {
  try {
    const modules = [
      'assetProfile', 
      'financialData', 
      'defaultKeyStatistics', 
      'summaryDetail',
      'incomeStatementHistory',
      'balanceSheetHistory'
    ];
    const summary = await yahooFinance.quoteSummary(ticker, { modules }) as any;
    
    // 특정 기업의 최신 뉴스 5개
    const searchResult = await yahooFinance.search(ticker, { newsCount: 5 }) as any;
    const news = searchResult.news ? searchResult.news.map((item: any) => ({
      title: item.title,
      link: item.link,
      publisher: item.publisher
    })) : [];

    // 과거 4년 재무 트렌드 요약 (한국/미국 공통)
    const incomeHistory = summary.incomeStatementHistory?.incomeStatementHistory || [];
    const balanceHistory = summary.balanceSheetHistory?.balanceSheetStatements || [];
    
    const historicalTrend = incomeHistory.map((inc: any, index: number) => {
      const bal = balanceHistory[index] || {};
      return {
        date: inc.endDate ? new Date(inc.endDate).toISOString().split('T')[0] : 'N/A',
        totalRevenue: inc.totalRevenue,
        operatingIncome: inc.operatingIncome,
        netIncome: inc.netIncome,
        totalAssets: bal.totalAssets,
        totalLiabilities: bal.totalLiab
      };
    });

    return {
      profile: summary.assetProfile,
      financials: summary.financialData,
      statistics: summary.defaultKeyStatistics,
      detail: summary.summaryDetail,
      historicalTrend,
      news
    };
  } catch (error) {
    console.error(`Failed to fetch deep data for ${ticker}:`, error);
    throw new Error('기업 데이터를 불러오는 중 오류가 발생했습니다. 올바른 티커(Ticker)인지 확인해주세요.');
  }
}

export async function getCompanyHistoricalData(ticker: string) {
  try {
    const endDate = new Date();
    // 5년 전 날짜 (5 * 365일)
    const startDate = new Date(endDate.getTime() - 5 * 365 * 24 * 60 * 60 * 1000);
    
    const period1 = startDate.toISOString().split('T')[0];
    const period2 = endDate.toISOString().split('T')[0];

    const chartResult = await yahooFinance.chart(ticker, { period1, period2, interval: '1d' } as any);
    
    // OHLCV 데이터 추출
    const history = chartResult.quotes.filter((q: any) => q.close !== null).map((q: any) => ({
      date: q.date.toISOString().split('T')[0],
      open: Number(q.open.toFixed(2)),
      high: Number(q.high.toFixed(2)),
      low: Number(q.low.toFixed(2)),
      close: Number(q.close.toFixed(2)),
      volume: q.volume
    }));

    return history;
  } catch (error) {
    console.error(`Failed to fetch historical data for ${ticker}:`, error);
    return [];
  }
}

export async function getIBNews() {
  const ibNames = ['Morgan Stanley', 'Goldman Sachs', 'JPMorgan', 'Bank of America', 'Citi'];
  const newsList = [];

  try {
    for (const ib of ibNames) {
      const searchResult = await yahooFinance.search(ib, { newsCount: 5 }) as any;
      if (searchResult.news) {
        newsList.push(...searchResult.news.map((item: any) => ({
          title: item.title,
          link: item.link,
          publisher: item.publisher,
          providerPublishTime: item.providerPublishTime,
          ib
        })));
      }
    }
    // Sort by time descending and take top 10
    return newsList.sort((a, b) => b.providerPublishTime - a.providerPublishTime).slice(0, 10);
  } catch (error) {
    console.error('Failed to fetch IB news:', error);
    return [];
  }
}
