import axios from 'axios';

// DART API 연동 모듈 (한국 기업 데이터용)
// DART는 상장사(기업) 고유번호(corp_code)를 먼저 알아야 API 호출이 가능합니다.
// 향후 고유번호 맵핑을 구현할 수 있으나, 본 모듈은 기본적으로 DART API 호출 뼈대를 제공합니다.

export async function getDartCompanyData(ticker: string) {
  const dartKey = process.env.DART_API_KEY;
  if (!dartKey) {
    console.warn('DART_API_KEY is not defined. Skipping DART data fetch.');
    return null;
  }

  try {
    // 티커(종목코드) 정리: 005930.KS -> 005930
    let cleanTicker = ticker.replace(/\.KS|\.KQ/gi, '');
    
    // 한국 기업은 종목코드가 6자리 숫자입니다.
    if (!/^\d{6}$/.test(cleanTicker)) {
      return null;
    }

    // 1. 기업개황 (회사 기본 정보)
    // DART는 종목코드로 바로 검색되지 않는 API도 많아, 우선 종목코드를 이용해 기본 정보를 가져옵니다.
    const companyInfoRes = await axios.get(`https://opendart.fss.or.kr/api/company.json?crtfc_key=${dartKey}&corp_code=${cleanTicker}`);
    
    // DART API 한도 초과나 오류 처리
    if (companyInfoRes.data.status !== '000') {
      console.warn(`DART API Error: ${companyInfoRes.data.message}`);
      return null;
    }

    const companyInfo = companyInfoRes.data;
    
    // 기업 고유번호 획득 (추가 상세 재무 조회용)
    const corpCode = companyInfo.corp_code;

    // 2. 주요 재무제표 (가장 최근 결산 기준)
    // 11011: 사업보고서
    const bsnsYear = new Date().getFullYear() - 1; // 작년 기준
    let financials = null;
    try {
        const finRes = await axios.get(`https://opendart.fss.or.kr/api/fnlttSinglAcnt.json?crtfc_key=${dartKey}&corp_code=${corpCode}&bsns_year=${bsnsYear}&reprt_code=11011`);
        if (finRes.data.status === '000') {
            financials = finRes.data.list;
        }
    } catch(e) {}

    return {
      source: 'DART',
      overview: {
        companyName: companyInfo.corp_name,
        companyNameEng: companyInfo.corp_name_eng,
        ceo: companyInfo.ceo_nm,
        industry: companyInfo.induty_code,
        establishmentDate: companyInfo.est_dt,
        description: `DART 공식 기업개황 정보 - 대표이사: ${companyInfo.ceo_nm}, 법인구분: ${companyInfo.corp_cls}`
      },
      dart_financials: financials
    };
  } catch (error: any) {
    console.error('DART Fetch Error:', error.message);
    return null;
  }
}
