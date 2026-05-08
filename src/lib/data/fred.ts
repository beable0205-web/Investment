export async function getFredData(seriesId: string, limit: number = 30) {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    throw new Error('FRED_API_KEY is not defined in environment variables');
  }

  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=${limit}`;

  let retries = 2;
  while (retries > 0) {
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`FRED API error: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      return data.observations;
    } catch (error) {
      console.error(`Failed to fetch FRED data for ${seriesId} (Retries left: ${retries - 1}):`, error);
      retries--;
      if (retries === 0) {
        // 완전 실패 시 전체 시스템이 다운되지 않도록 빈 배열 반환 (Graceful Fallback)
        console.error(`FRED API permanently failed for ${seriesId}. Returning empty array.`);
        return [{ value: null }];
      }
      // 짧게 대기 후 재시도
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

export async function getMacroIndicators() {
  // T10Y2Y: 10-Year Treasury Constant Maturity Minus 2-Year Treasury Constant Maturity
  // M2SL: M2
  // UNRATE: Unemployment Rate
  
  const [yieldCurve, m2, unrate] = await Promise.all([
    getFredData('T10Y2Y', 1),
    getFredData('M2SL', 1),
    getFredData('UNRATE', 1)
  ]);

  return {
    yieldCurve: yieldCurve[0]?.value || null,
    m2: m2[0]?.value || null,
    unemploymentRate: unrate[0]?.value || null,
  };
}
