import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';
import yahooFinancePkg from 'yahoo-finance2';
import { GoogleGenAI } from '@google/genai';

let yahooFinance = yahooFinancePkg;
if (yahooFinance && (yahooFinance as any).default) {
  yahooFinance = (yahooFinance as any).default;
}
if (typeof yahooFinance === 'function') {
  yahooFinance = new (yahooFinance as any)();
}

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const FUNDAMENTAL_DIR = path.join(process.cwd(), 'src', 'data', 'fundamentals');
if (!fs.existsSync(FUNDAMENTAL_DIR)) {
  fs.mkdirSync(FUNDAMENTAL_DIR, { recursive: true });
}

// 딜레이 함수 (Rate Limit 회피용)
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

import * as cheerio from 'cheerio';

async function fetchAllUSTickers(): Promise<string[]> {
  console.log('Fetching ALL US ticker list from SEC (약 10,000개 이상)...');
  try {
    const res = await fetch('https://www.sec.gov/files/company_tickers.json', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    if (!res.ok) throw new Error('Failed to fetch SEC tickers');
    
    const data: Record<string, { ticker: string, title: string }> = await res.json();
    const tickers = Object.values(data).map(item => item.ticker.replace('.', '-'));
    
    const all = Array.from(new Set(tickers));
    // 알파벳만 있는 순수 티커 필터링
    return all.filter(t => /^[A-Z\-]+$/.test(t));
  } catch (error) {
    console.warn('Failed to fetch SEC list. Falling back to default major tickers.');
    return ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'META', 'GOOGL', 'TSLA', 'BRK-B', 'JPM', 'V', 'JNJ', 'WMT', 'PG', 'MA'];
  }
}

async function analyzeFundamentalsWithAI(ticker: string, financialData: any, ai: any): Promise<any> {
  const prompt = `
당신은 월스트리트의 전설적인 펀더멘털 애널리스트입니다. 워런 버핏과 피터 린치의 철학을 결합하여, 기업의 재무제표를 바탕으로 경제적 해자와 파산 위험을 분석합니다.

분석할 기업 티커: ${ticker}

[가공된 재무 데이터 원본 (Yahoo Finance)]
${JSON.stringify(financialData, null, 2)}

요청 사항:
위 재무 데이터를 철저하게 분석하여, 향후 '궁극의 AI 투자 시스템'이 종목을 선별하고 트레이딩 전략을 수립하는 데 필요한 핵심 데이터 셋(Foundation Data)을 구축하십시오.
단순한 점수나 매수/매도 추천이 아니라, 이 기업의 고유한 펀더멘털 특성과 거시경제/기술적 패턴과의 연관성을 분석해야 합니다.

반환 형식 (JSON):
{
  "fundamental_traits": {
    "growth": "매출 및 이익 성장성 요약 (예: 고성장, 정체, 역성장)",
    "profitability": "마진 및 수익성 구조 (예: 독점적 마진, 박리다매, 적자 늪)",
    "cashflow_stability": "현금 창출 능력 및 부채 리스크 (예: 현금 창출력 우수, 레버리지 과다)"
  },
  "macro_sensitivity": "금리 인상, 인플레이션, 경기 침체 등 거시경제(Macro) 변수에 대한 이 기업의 민감도와 방어력 (예: 금리 인하 수혜주, 경기 방어주)",
  "technical_synergy": "이러한 펀더멘털을 가진 기업이 '단테의 밥그릇 3번 자리(장기 이평선 돌파 및 지지)' 같은 차트 패턴을 만들 때 기대할 수 있는 폭발력이나 신뢰도 분석",
  "business_moat": "이 기업의 핵심 비즈니스 모델과 경제적 해자(Moat)에 대한 2문장 요약",
  "ai_system_tags": ["Value", "High-Growth", "Turnaround", "Dividend", "Cyclical", "Defensive"] // 이 기업을 분류할 수 있는 퀀트/시스템 트레이딩용 태그 2~3개
}
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1 // 분석의 일관성을 위해 낮게 설정
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (err: any) {
    console.error(`[AI Analysis Failed for ${ticker}]`, err.message);
    throw err; // 상위에서 Catch하여 처리
  }
}

export async function runFundamentalCrawler() {
  console.log('============================================');
  console.log('🧠 초거대 펀더멘털 학습 엔진 (Daemon) 시작');
  console.log('============================================');

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not defined');
  const ai = new GoogleGenAI({ apiKey });

  const allTickers = await fetchAllUSTickers();
  console.log(`총 ${allTickers.length}개의 종목을 학습 목록에 추가했습니다.`);

  let learnedCount = 0;
  let skippedCount = 0;

  for (const ticker of allTickers) {
    const filePath = path.join(FUNDAMENTAL_DIR, `${ticker}.json`);

    // 1. 이어하기(Resume) 기능: 이미 학습된 최신 데이터(30일 이내)가 있으면 패스
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      const daysOld = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60 * 24);
      if (daysOld < 30) {
        skippedCount++;
        continue; // 최근 30일 내에 학습한 종목은 스킵 (컴퓨터 껐다 켜도 이어하기 가능)
      }
    }

    try {
      console.log(`\n🔍 [${ticker}] 펀더멘털 데이터 수집 및 학습 중...`);
      
      // 2. 최대한 많은 재무 데이터 확보 (Quote, Financials, Statistics, Insights)
      const quote = await (yahooFinance as any).quote(ticker);
      const quoteSummary = await (yahooFinance as any).quoteSummary(ticker, { 
        modules: ['financialData', 'defaultKeyStatistics'] 
      });

      const extractedData = {
        name: quote.shortName || quote.longName || ticker,
        marketCap: quote.marketCap,
        trailingPE: quote.trailingPE,
        forwardPE: quote.forwardPE,
        priceToBook: quote.priceToBook,
        totalRevenue: quoteSummary.financialData?.totalRevenue,
        operatingMargins: quoteSummary.financialData?.operatingMargins,
        returnOnEquity: quoteSummary.financialData?.returnOnEquity,
        freeCashflow: quoteSummary.financialData?.freeCashflow,
        totalCash: quoteSummary.financialData?.totalCash,
        totalDebt: quoteSummary.financialData?.totalDebt,
        currentRatio: quoteSummary.financialData?.currentRatio,
        revenueGrowth: quoteSummary.financialData?.revenueGrowth,
      };

      // 만약 데이터가 너무 부실한 페니스탁/페이퍼컴퍼니면 학습 가치 없으므로 즉시 탈락
      if (!extractedData.marketCap || (!extractedData.totalRevenue && !extractedData.totalDebt)) {
        console.log(`⚠️ [${ticker}] 재무 데이터가 부족하거나 불투명한 기업입니다. (쓰레기통 직행)`);
        fs.writeFileSync(filePath, JSON.stringify({
          ticker,
          lastUpdated: new Date().toISOString(),
          isInvestable: false,
          redFlags: ["불투명한 재무 데이터 (데이터 제공 안됨)"],
          moatAndBusiness: "데이터가 존재하지 않는 껍데기 회사거나 상장폐지 위험 종목."
        }, null, 2));
        continue;
      }

      // 3. AI에게 데이터 넘기고 분석 요청
      const aiJudgment = await analyzeFundamentalsWithAI(ticker, extractedData, ai);

      // 4. 로컬 DB (JSON) 저장
      const finalRecord = {
        ticker,
        lastUpdated: new Date().toISOString(),
        rawFinancials: extractedData,
        analysis: aiJudgment
      };

      fs.writeFileSync(filePath, JSON.stringify(finalRecord, null, 2));
      console.log(`✅ [${ticker}] 심층 학습 완료! (태그: ${aiJudgment.ai_system_tags?.join(', ') || '태그 없음'})`);
      learnedCount++;

      // 야후 파이낸스 IP 차단(429)을 피하기 위해 안전 속도(3초) 유지
      await sleep(3000);

    } catch (error: any) {
      if (error.message.includes('429') || error.message.includes('Too Many Requests') || error.message.includes('Quota')) {
        console.error(`\n🚨 [Rate Limit 감지] 429 에러 발생! (야후 파이낸스 서버가 IP를 일시 차단했거나 구글 속도 제한)`);
        console.log(`🛡️ 영구 차단(IP Freeze) 방지를 위해 아주 안전하게 15분 동안 대기합니다...`);
        console.log(`(15분 뒤 실패한 [${ticker}]부터 조심스럽게 학습 재개)`);
        await sleep(15 * 60 * 1000); // 15분 대기 후 재시도
      } else {
        console.error(`❌ [${ticker}] 학습 중 에러 발생:`, error.message);
        // 야후 파이낸스에서 일시적으로 차단했거나 찾을 수 없는 티커일 경우 5초 대기 후 다음으로 넘어감
        await sleep(5000);
      }
    }
  }

  console.log('============================================');
  console.log(`🎉 금일 학습 세션 종료! (새로 학습한 종목: ${learnedCount}개, 이미 아는 종목(스킵): ${skippedCount}개)`);
  console.log('============================================');
}

// Start crawler directly when file is executed
runFundamentalCrawler().catch(err => {
  console.error('크롤러 치명적 에러:', err);
});
