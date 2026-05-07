import axios from 'axios';

// FMP (Financial Modeling Prep) API 연동 모듈 (미국 기업 데이터용)
// 월가 기관에서 사용하는 방대한 재무제표, 밸류에이션, SEC Filings 데이터를 제공합니다.

export async function getFmpCompanyData(ticker: string) {
  const fmpKey = process.env.FMP_API_KEY;
  if (!fmpKey) {
    console.warn('FMP_API_KEY is not defined. Skipping FMP data fetch.');
    return null;
  }

  try {
    const cleanTicker = ticker.toUpperCase().replace(/[^A-Z]/g, ''); // AAPL 등 영어만 남김
    
    // 한국 주식이면 FMP 사용 안 함 (FMP도 한국주식을 일부 지원하지만 DART가 더 낫습니다)
    if (/^\d+/.test(ticker)) {
      return null;
    }

    console.log(`Fetching FMP Data for ${cleanTicker}...`);

    // 1. Company Profile (심층 비즈니스 설명 및 팩트)
    const profileRes = await axios.get(`https://financialmodelingprep.com/api/v3/profile/${cleanTicker}?apikey=${fmpKey}`);
    const profile = profileRes.data[0];

    if (!profile) return null;

    // 2. Key Metrics (핵심 밸류에이션 지표 - TTM)
    const metricsRes = await axios.get(`https://financialmodelingprep.com/api/v3/key-metrics-ttm/${cleanTicker}?apikey=${fmpKey}`);
    const metrics = metricsRes.data[0];

    // 3. Financial Growth (성장성 지표)
    const growthRes = await axios.get(`https://financialmodelingprep.com/api/v3/financial-growth/${cleanTicker}?limit=1&apikey=${fmpKey}`);
    const growth = growthRes.data[0];

    // 4. Historical Income Statement (과거 5년치 손익 트렌드)
    const incRes = await axios.get(`https://financialmodelingprep.com/api/v3/income-statement/${cleanTicker}?limit=5&apikey=${fmpKey}`);
    const historicalTrend = incRes.data.map((inc: any) => ({
      date: inc.date,
      revenue: inc.revenue,
      operatingIncome: inc.operatingIncome,
      netIncome: inc.netIncome,
      eps: inc.eps
    }));

    return {
      source: 'FMP',
      overview: {
        companyName: profile.companyName,
        ceo: profile.ceo,
        sector: profile.sector,
        industry: profile.industry,
        description: profile.description, // 야후 파이낸스보다 훨씬 길고 디테일한 10-K 기반 설명
        website: profile.website,
        fullTimeEmployees: profile.fullTimeEmployees
      },
      valuation: {
        peRatioTTM: metrics?.peRatioTTM,
        pbRatioTTM: metrics?.pbRatioTTM,
        evToEbitdaTTM: metrics?.enterpriseValueOverEBITDATTM, // 야후에서 구하기 힘든 EV/EBITDA
        roeTTM: metrics?.roeTTM,
        dividendYieldTTM: metrics?.dividendYieldPercentageTTM,
        dcf: profile.dcf // FMP 자체 알고리즘 기반 DCF 적정주가
      },
      growth: {
        revenueGrowth: growth?.revenueGrowth,
        epsGrowth: growth?.epsgrowth,
        freeCashFlowGrowth: growth?.freeCashFlowGrowth
      },
      historicalTrend
    };
  } catch (error: any) {
    console.error('FMP Fetch Error:', error.message);
    return null;
  }
}
