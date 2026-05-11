import axios from 'axios';

// 네이버 모바일 금융 API를 활용한 데이터 크롤러 (HTML 파싱 없이 JSON 응답 파싱)
export async function getNaverCompanyData(ticker: string) {
  try {
    const cleanTicker = ticker.replace(/\.KS|\.KQ/gi, '');
    if (!/^\d{6}$/.test(cleanTicker)) {
      return null;
    }

    // 1. 기업 개요 및 주요 지표 (PER, PBR, 매출, 리포트 등)
    const integrationUrl = `https://m.stock.naver.com/api/stock/${cleanTicker}/integration`;
    const integrationRes = await axios.get(integrationUrl);
    const data = integrationRes.data;

    if (!data) {
      return null;
    }

    // 기업 개요
    const description = data.description || '기업 개요 정보 없음';
    
    // 주요 지표 추출
    const extractTotalInfo = (key: string) => {
      const item = data.totalInfos?.find((i: any) => i.key === key);
      return item ? item.value : 'N/A';
    };

    const financials = {
      marketCap: extractTotalInfo('시총'),
      per: extractTotalInfo('PER'),
      pbr: extractTotalInfo('PBR'),
      eps: extractTotalInfo('EPS'),
      bps: extractTotalInfo('BPS'),
      dividendYield: extractTotalInfo('배당수익률'),
      consensusTarget: data.consensusInfo?.priceTargetMean || 'N/A'
    };

    // 최근 증권사 리포트 헤드라인
    const reports = (data.researches || []).slice(0, 5).map((r: any) => ({
      title: r.tit,
      broker: r.bnm,
      date: r.wdt
    }));

    // 2. 최신 뉴스 추출
    const newsUrl = `https://m.stock.naver.com/api/news/stock/${cleanTicker}?pageSize=5`;
    const newsRes = await axios.get(newsUrl);
    const newsData = newsRes.data || [];
    
    // 네이버 뉴스는 중첩된 배열로 응답됨
    const newsHeadlines: string[] = [];
    newsData.forEach((group: any) => {
      if (group.items && Array.isArray(group.items)) {
        group.items.forEach((item: any) => {
          if (item.tit) newsHeadlines.push(item.tit);
        });
      }
    });

    return {
      ticker: cleanTicker,
      description,
      financials,
      recentReports: reports,
      newsHeadlines: newsHeadlines.slice(0, 5) // 최상위 5개만
    };

  } catch (error: any) {
    console.error(`Naver Finance Fetch Error for ${ticker}:`, error.message);
    return null;
  }
}
