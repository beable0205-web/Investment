/**
 * 한국투자증권 OpenAPI (KIS) 연동 모듈
 * 모의투자(Paper Trading) 및 실전투자(Real Trading) 대응
 */

const KIS_API_BASE_URL = process.env.KIS_IS_MOCK === 'true'
  ? 'https://openapivts.koreainvestment.com:29443' // 모의투자 도메인
  : 'https://openapi.koreainvestment.com:9443';    // 실전투자 도메인

let cachedAccessToken: string | null = null;
let tokenExpiresAt: number = 0;

export async function getAccessToken(): Promise<string> {
  // 토큰 캐싱 (보통 24시간 유효)
  if (cachedAccessToken && Date.now() < tokenExpiresAt) {
    return cachedAccessToken;
  }

  const appKey = process.env.KIS_APP_KEY;
  const appSecret = process.env.KIS_APP_SECRET;

  if (!appKey || !appSecret) {
    throw new Error('KIS_APP_KEY 또는 KIS_APP_SECRET 환경변수가 설정되지 않았습니다.');
  }

  const url = `${KIS_API_BASE_URL}/oauth2/tokenP`;
  const body = {
    grant_type: 'client_credentials',
    appkey: appKey,
    appsecret: appSecret
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const data = await response.json();
  if (data.access_token) {
    cachedAccessToken = data.access_token as string;
    // 24시간 후 만료되지만 여유를 두고 20시간 후 재발급 하도록 설정
    tokenExpiresAt = Date.now() + 20 * 60 * 60 * 1000; 
    return cachedAccessToken;
  } else {
    throw new Error(`KIS 토큰 발급 실패: ${JSON.stringify(data)}`);
  }
}

/**
 * 미국 해외주식 매수/매도 주문 API
 * @param ticker 종목코드 (예: AAPL)
 * @param price 주문단가 (시장가일 경우 0 입력)
 * @param qty 주문수량
 * @param isBuy 매수/매도 여부
 * @returns 주문 결과
 */
export async function placeUSOrder(ticker: string, price: number, qty: number, isBuy: boolean) {
  const token = await getAccessToken();
  const tr_id = process.env.KIS_IS_MOCK === 'true' 
    ? (isBuy ? 'VTTS3000U' : 'VTTS3008U')  // 모의투자 미국주식 매수/매도
    : (isBuy ? 'JTTT1002U' : 'JTTT1006U'); // 실전투자 (임시 TR_ID. 공식 문서 확인 필요)

  const url = `${KIS_API_BASE_URL}/uapi/overseas-stock/v1/trading/order`;

  const body = {
    CANO: process.env.KIS_ACCOUNT_NO?.substring(0, 8),
    ACNT_PRDT_CD: process.env.KIS_ACCOUNT_NO?.substring(8, 10), // 보통 "01"
    OVRS_EXCG_CD: "NASD", // 예: NASDAQ. 종목에 따라 NYSE 등 변경 필요하지만 KIS에선 자동 라우팅 지원하기도 함
    PDNO: ticker,
    ORD_QTY: qty.toString(),
    OVRS_ORD_UNPR: price === 0 ? "0" : price.toString(),
    ORD_SVR_DVSN_CD: "0",
    ORD_DVSN: price === 0 ? "00" : "00" // 00: 지정가 (미국은 시장가 주문 제한이 있어 현재가 주변 지정가로 통일하는 편이 안전함)
  };

  const headers = {
    'Content-Type': 'application/json',
    'authorization': `Bearer ${token}`,
    'appkey': process.env.KIS_APP_KEY!,
    'appsecret': process.env.KIS_APP_SECRET!,
    'tr_id': tr_id,
    'custtype': 'P',
  };

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });

  return await response.json();
}

/**
 * 미국 주식 계좌 잔고 조회
 */
export async function getUSAccountBalance() {
  const token = await getAccessToken();
  const url = `${KIS_API_BASE_URL}/uapi/overseas-stock/v1/trading/inquire-balance`;
  
  const params = new URLSearchParams({
    CANO: process.env.KIS_ACCOUNT_NO?.substring(0, 8) || '',
    ACNT_PRDT_CD: process.env.KIS_ACCOUNT_NO?.substring(8, 10) || '',
    OVRS_EXCG_CD: "NASD",
    TR_CRCY_CD: "USD",
    CTX_AREA_FK200: "",
    CTX_AREA_NK200: ""
  });

  const tr_id = process.env.KIS_IS_MOCK === 'true' ? 'VTTS3012R' : 'JTTT3012R';

  const headers = {
    'authorization': `Bearer ${token}`,
    'appkey': process.env.KIS_APP_KEY!,
    'appsecret': process.env.KIS_APP_SECRET!,
    'tr_id': tr_id,
    'custtype': 'P',
  };

  const response = await fetch(`${url}?${params.toString()}`, { headers });
  return await response.json();
}
