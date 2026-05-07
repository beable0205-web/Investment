import fs from 'fs';
import path from 'path';

async function generateWithRetry(ai: any, prompt: string, modelStr: string, retries = 3, backoff = 5000) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await ai.models.generateContent({
        model: modelStr,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
          responseSchema: {
            type: "OBJECT",
            properties: {
              content: { type: "STRING" },
              key_points: { type: "ARRAY", items: { type: "STRING" } }
            },
            required: ["content"]
          }
        }
      });
      return JSON.parse(response.text);
    } catch (err: any) {
      console.warn(`[Gemini API] Attempt ${i + 1}/${retries} failed: ${err.message}`);
      if (i === retries - 1) throw err;
      // Wait before retrying (exponential backoff)
      const waitTime = backoff * (i + 1);
      console.log(`[Gemini API] Retrying in ${waitTime}ms...`);
      await new Promise(res => setTimeout(res, waitTime));
    }
  }
}

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

  const sectionsList = [
    { title: "Investment Summary", desc: "핵심 투자 포인트 3가지, 적정 가치 및 밸류에이션 요약. [지시사항: 재무 수치와 밸류에이션 결과를 정리한 마크다운 표(Table) 필수 포함]" },
    { title: "Industry & Macro Environment", desc: "전방 산업의 성장성, 매크로 변수가 미치는 영향, 시장 점유율 및 경쟁 강도 심층 분석. [지시사항: 경쟁사 비교(Peer Group Analysis) 마크다운 표 필수 포함]" },
    { title: "Business Model & Economic Moat", desc: "비즈니스 모델의 해부, 매출 비중, 비용 구조, 전환 비용 및 네트워크 효과 등 경제적 해자 증명. [지시사항: 비즈니스 모델이나 가치 사슬(Value Chain)을 텍스트 기반 다이어그램 또는 표 형식으로 도식화]" },
    { title: "Financial Health & Earnings", desc: "과거 4년 재무 트렌드 분석, FCF 생성 능력, 향후 실적 추정 및 DCF/Multiple 밸류에이션 도출 과정. [지시사항: 과거 재무 데이터와 향후 3년 추정치를 담은 마크다운 표 필수 포함]" },
    { title: "Risk Factors & Downside Scenario", desc: "핵심 리스크, 경쟁자 위협, 규제 리스크 및 최악의 시나리오 하에서의 다운사이드 분석. [지시사항: 발생 가능한 시나리오별(Base, Bull, Bear) 주가 추정치를 표로 제시할 것]" }
  ];

  const generatedSections = [];
  let previousContext = "";

  for (let i = 0; i < sectionsList.length; i++) {
    const sec = sectionsList[i];
    console.log(`Generating Fundamental Section ${i + 1}/5: ${sec.title}...`);

    const prompt = `
당신은 서울대 SMIC(Student Investment Club) 또는 글로벌 탑티어 IB 수준의 "초정밀 심층 기본적 분석가"입니다.
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
[이전까지 작성된 리포트 내용 요약 (문맥 유지용)]
${previousContext || '없음 (첫 섹션)'}

---
[요청 사항]
지금 당신은 전체 5개 섹션 중 **[ ${sec.title} ]** 섹션만을 단독으로 작성해야 합니다.
이 리포트는 총 30페이지 분량을 목표로 하므로, 이번 섹션 하나만으로도 최소 2,000자에서 3,000자 이상의 매우 방대하고 집요한 논리적 전개를 펼치십시오.
데이터를 바탕으로 구체적이고 정교하게 서술하며, 기술적 분석은 배제하십시오.

<현재 섹션 작성 지침>
- 주제: ${sec.desc}
- 반드시 위 지시사항에 명시된 형태의 마크다운 표(Table)나 시각화 요소를 최소 1개 이상 포함시키십시오.
`;

    try {
      const result = await generateWithRetry(ai, prompt, 'gemini-2.5-pro');
      
      generatedSections.push({
        title: sec.title,
        content: result.content,
        key_points: result.key_points || []
      });

      // 요약해서 다음 컨텍스트로 넘김 (너무 길면 잘라냄)
      previousContext += `\n[${sec.title}]\n${result.content.substring(0, 500)}...`;
    } catch (error: any) {
      console.error(`Error generating section ${sec.title}:`, error);
      generatedSections.push({
        title: sec.title,
        content: `Error generating this section: ${error.message || error}\n\n**(현재 구글 제미나이 서버에 일시적인 트래픽 폭주가 발생하여 응답을 받지 못했습니다. 잠시 후 다시 시도해주세요.)**`,
        key_points: []
      });
    }
  }

  return {
    ticker,
    company_name: companyData.price?.shortName || ticker,
    summary: "SMIC Level Fundamental Research Report",
    type: "fundamental",
    sections: generatedSections
  };
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

  const sectionsList = [
    { title: "Trading Summary", desc: "현재 차트의 전체적인 흐름 요약, 밥그릇 국면 파악 및 단기/중기 매매 포지션 전략. [지시사항: 현재 포지션 요약을 마크다운 표로 제시]" },
    { title: "Trend & Moving Averages", desc: "장기(224일/112일) 및 단기 추세, 이평선 정배열/역배열 상태, 이격도 및 회귀 가능성 심층 분석. [지시사항: 주요 이평선 이격도 및 상태를 마크다운 표로 제시]" },
    { title: "Support, Resistance & Volume", desc: "세력이 만든 핵심 지지/저항 라인(가격대 명시), 매물대(언덕/공구리), 매집봉 및 거래량 폭발의 의미 분석. [지시사항: 1차~3차 지지/저항 가격대를 마크다운 표로 구체적으로 명시]" },
    { title: "Chart Patterns", desc: "쌍바닥, 헤드앤숄더, 대칭삼각수렴 등 특수 패턴 점검 및 세력의 흔적 추적. [지시사항: 패턴 발생 시점과 목표가를 표 형태로 도식화]" },
    { title: "Actionable Trading Plan", desc: "구체적인 1차/2차 진입 타점, 분할 매도 목표가, 생명선(손절 라인) 이탈 시 대응 시나리오 및 비중 조절 전략. [지시사항: 매수/매도/손절 타점과 비중을 마크다운 표로 명확히 제시]" }
  ];

  const generatedSections = [];
  let previousContext = "";

  for (let i = 0; i < sectionsList.length; i++) {
    const sec = sectionsList[i];
    console.log(`Generating Technical Section ${i + 1}/5: ${sec.title}...`);

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
[이전까지 작성된 리포트 내용 요약 (문맥 유지용)]
${previousContext || '없음 (첫 섹션)'}

---
[요청 사항]
지금 당신은 전체 5개 섹션 중 **[ ${sec.title} ]** 섹션만을 단독으로 작성해야 합니다.
이 리포트는 총 30페이지 분량을 목표로 하므로, 이번 섹션 하나만으로도 실전 매매에 당장 적용할 수 있을 정도로 집요하고 상세한 분석(최소 2,000자 이상)을 서술하십시오.
주입된 단테의 원칙들을 기계적으로 나열하지 말고, 세력의 의도와 개인 투자자의 심리 상태를 읽어내는 전문 트레이더의 시각에서 차트를 완전히 해부하십시오.

<현재 섹션 작성 지침>
- 주제: ${sec.desc}
- 반드시 위 지시사항에 명시된 형태의 마크다운 표(Table)나 시각화 요소를 최소 1개 이상 포함시키십시오.
`;

    try {
      const result = await generateWithRetry(ai, prompt, 'gemini-2.5-pro');
      
      generatedSections.push({
        title: sec.title,
        content: result.content,
        key_points: result.key_points || []
      });

      previousContext += `\n[${sec.title}]\n${result.content.substring(0, 500)}...`;
    } catch (error: any) {
      console.error(`Error generating section ${sec.title}:`, error);
      generatedSections.push({
        title: sec.title,
        content: `Error generating this section: ${error.message || error}\n\n**(현재 구글 제미나이 서버에 일시적인 트래픽 폭주가 발생하여 응답을 받지 못했습니다. 잠시 후 다시 시도해주세요.)**`,
        key_points: []
      });
    }
  }

  return {
    ticker,
    company_name: companyData.price?.shortName || ticker,
    summary: "Professional Technical Trading Report",
    type: "technical",
    sections: generatedSections
  };
}
