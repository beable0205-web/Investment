import fs from 'fs';
import path from 'path';

export async function generateFundamentalReport(ticker: string, companyData: any, currentPrice: number) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not defined');

  let fundamentalRules = '';
  try {
    const fPath = path.join(process.cwd(), 'src', 'data', 'archive', 'fundamental_rules.json');
    if (fs.existsSync(fPath)) {
      const rules = JSON.parse(fs.readFileSync(fPath, 'utf-8'));
      fundamentalRules = rules.map((r: any) => `- ${r.category}: ${r.rule}`).join('\n');
    }
  } catch (err) {
    console.error('Failed to load fundamental rules:', err);
  }

  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey });

  let institutionalText = '';
  if (companyData.institutional) {
    const inst = companyData.institutional;
    institutionalText = `
[기관급 딥다이브 데이터 (${inst.source})]
상세 비즈니스 개요: ${inst.overview?.description || ''}
${inst.valuation ? `세부 밸류에이션: EV/EBITDA ${inst.valuation.evToEbitdaTTM}, ROE ${inst.valuation.roeTTM}, 배당수익률 ${inst.valuation.dividendYieldTTM}%, DCF적정가 ${inst.valuation.dcf}` : ''}
${inst.growth ? `성장성 지표: 매출성장률 ${inst.growth.revenueGrowth}, EPS성장률 ${inst.growth.epsGrowth}, FCF성장률 ${inst.growth.freeCashFlowGrowth}` : ''}
${inst.historicalTrend ? `[과거 5년 손익 트렌드]\n${JSON.stringify(inst.historicalTrend)}` : ''}
${inst.dart_financials ? `DART 핵심 재무 데이터: ${JSON.stringify(inst.dart_financials).substring(0, 500)}` : ''}
`;
  }

  const prompt = `
당신은 하워드 막스와 워렌 버핏의 가치투자 철학을 마스터한 세계 최고의 "기본적 분석가(Fundamental Analyst)"입니다.
사용자가 요청한 기업 티커: [${ticker.toUpperCase()}]
현재 종가: ${currentPrice}

[기업 기본 데이터 (Yahoo Finance)]
비즈니스 개요: ${companyData.profile?.longBusinessSummary?.substring(0, 1000)}...
섹터: ${companyData.profile?.sector} / 산업: ${companyData.profile?.industry}
재무 지표: 유동비율 ${companyData.financials?.currentRatio}, 부채비율 ${companyData.financials?.debtToEquity}, 영업이익률 ${companyData.financials?.operatingMargins}, 영업현금흐름 ${companyData.financials?.operatingCashflow}
밸류에이션: P/E(T) ${companyData.detail?.trailingPE}, P/B ${companyData.statistics?.priceToBook}, ROE ${companyData.financials?.returnOnEquity}
[과거 4년 재무 트렌드]
${JSON.stringify(companyData.historicalTrend)}
최신 뉴스: ${companyData.news?.map((n: any) => `- ${n.title}`).join('\n')}

${institutionalText}
---
[당신의 뇌에 주입된 '절대 원칙']
<기본적 분석 원칙>
${fundamentalRules || '기업의 본질 가치, 비즈니스 모델 해자, 재무 건전성 및 밸류에이션에 집중하여 분석하십시오.'}

---
[요청 사항]
당신은 서울대 SMIC 또는 글로벌 IB 수준의 **"심층 기본적 분석 리포트(Fundamental Research Report)"**를 작성해야 합니다.
기술적 분석(차트 분석)은 철저히 배제하고, 기업의 펀더멘탈과 내재 가치에만 100% 집중하십시오.

<리포트 섹션 필수 구성>
1. Investment Summary (투자 핵심 요약 및 밸류에이션 코멘트)
2. Industry & Macro Environment (매크로 환경 및 산업 동향 분석)
3. Business Model & Economic Moat (비즈니스 모델 및 경제적 해자 분석)
4. Financial Health & Earnings (재무 건전성 및 실적 분석)
5. Risk Factors & Downside Scenario (핵심 리스크 및 다운사이드 시나리오)
위 5개 섹션으로 구성된 매우 깊이 있고 전문적인 학술적/논문형 리포트를 마크다운으로 작성하세요.
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
        responseSchema: {
          type: "OBJECT",
          properties: {
            ticker: { type: "STRING" },
            company_name: { type: "STRING" },
            summary: { type: "STRING" },
            type: { type: "STRING" },
            sections: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  title: { type: "STRING" },
                  content: { type: "STRING" },
                  key_points: { type: "ARRAY", items: { type: "STRING" } }
                },
                required: ["title", "content"]
              }
            }
          },
          required: ["ticker", "company_name", "summary", "sections"]
        }
      }
    });
    
    const result = JSON.parse(response.text);
    result.type = "fundamental";
    return result;
  } catch (error) {
    console.error('Gemini API error (Fundamental):', error);
    throw error;
  }
}

export async function generateTechnicalReport(ticker: string, companyData: any, history: any[], currentPrice: number) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not defined');

  let technicalRules = '';
  try {
    const tPath = path.join(process.cwd(), 'src', 'data', 'archive', 'technical_rules.json');
    if (fs.existsSync(tPath)) {
      const rules = JSON.parse(fs.readFileSync(tPath, 'utf-8'));
      technicalRules = rules.map((r: any) => `- ${r.category}: ${r.rule}`).join('\n');
    }
  } catch (err) {
    console.error('Failed to load technical rules:', err);
  }

  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey });

  const dataString = history.map(h => `[${h.date}] 시가:${h.open} 고가:${h.high} 저가:${h.low} 종가:${h.close} 거래량:${h.volume}`).join('\n');

  const prompt = `
당신은 유튜브 최고 주식 전문가(주식단테)의 모든 기법을 완벽하게 체화한 세계 최고의 "기술적 분석가(Technical Analyst)"이자 트레이더입니다.
사용자가 요청한 기업 티커: [${ticker.toUpperCase()}]
현재 종가: ${currentPrice}

[최근 5년 일봉 차트 데이터 (OHLCV 요약)]
${dataString.length > 30000 ? dataString.slice(-30000) : dataString}

---
[당신의 뇌에 주입된 '절대 기술적 분석 원칙']
아래 원칙들을 무조건 100% 적용하여 차트를 분석하고 타점을 잡으십시오. 기업의 재무나 비즈니스 모델 얘기는 철저히 배제하십시오.
<단테 기술적 분석 원칙 및 기법>
${technicalRules || '차트 추세, 224일선/112일선 지지 및 저항, 밥그릇 기법, 매집봉, 거래량을 통한 세력 파악에 집중하십시오.'}

---
[요청 사항]
오로지 가격의 움직임, 거래량, 추세선, 이평선, 지지/저항, 매집/분산 패턴만을 다루는 **"실전 트레이딩 기술적 분석 리포트(Technical Analysis Report)"**를 작성해야 합니다.
주입된 원칙들을 기계적으로 나열하지 말고 전문 트레이더의 시각에서 차트를 해부하듯 자연스럽게 서술하십시오.

<리포트 섹션 필수 구성>
1. Trading Summary (현재 차트 요약 및 단기/중기 매매 포지션)
2. Trend & Moving Averages (장단기 추세 및 이평선 배열, 이격도 분석)
3. Support, Resistance & Volume (핵심 지지/저항 라인, 언덕/공구리, 매집 거래량 분석)
4. Chart Patterns (밥그릇 패턴 1~4번 자리, 쌍바닥 등 특수 패턴 점검)
5. Actionable Trading Plan (구체적인 진입 타점, 목표가, 생명선/손절 라인 대응 전략)
위 5개 섹션으로 구성된 깊이 있는 기술적 실전 리포트를 마크다운으로 작성하세요.
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
        responseSchema: {
          type: "OBJECT",
          properties: {
            ticker: { type: "STRING" },
            company_name: { type: "STRING" },
            summary: { type: "STRING" },
            type: { type: "STRING" },
            sections: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  title: { type: "STRING" },
                  content: { type: "STRING" },
                  key_points: { type: "ARRAY", items: { type: "STRING" } }
                },
                required: ["title", "content"]
              }
            }
          },
          required: ["ticker", "company_name", "summary", "sections"]
        }
      }
    });
    
    const result = JSON.parse(response.text);
    result.type = "technical";
    return result;
  } catch (error) {
    console.error('Gemini API error (Technical):', error);
    throw error;
  }
}
