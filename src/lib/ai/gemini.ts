import { GoogleGenAI } from '@google/genai';

export async function reflectOnPerformance(oldArchive: any, currentMacro: any, currentEtfData: any) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not defined in environment variables');
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
당신은 하워드 막스와 스탠리 드러켄밀러의 철학을 따르는 최고투자책임자(CIO)입니다.
지금 당신은 당신이 과거에 내렸던 투자 결정을 복기하고, 처절하게 반성하여 새로운 교훈을 도출하는 '자기 성찰(Self-Reflection)' 시간을 가지고 있습니다.

[당신의 과거 결정 (약 1주일 전)]
당시 당신의 거시경제 가설:
${oldArchive.explanation}

당시 결정했던 포트폴리오 비중:
${JSON.stringify(oldArchive.portfolio, null, 2)}

[현재 시장 현실 (Reality Check)]
현재 FRED 거시경제 지표:
- 10년물-2년물 금리차: ${currentMacro.yieldCurve}
- M2 유동성: ${currentMacro.m2}
- 실업률: ${currentMacro.unemploymentRate}%

현재 ETF 가격 동향:
${JSON.stringify(currentEtfData, null, 2)}

[요청 사항]
과거 당신의 가설이 현재 시장 상황 및 가격 변화와 얼마나 맞아떨어졌는지 냉정하게 평가하십시오.
당신이 놓쳤던 거시경제적 변수나 오판이 있었다면 인정하고, 다음 분석부터 똑같은 실수를 반복하지 않기 위해 뼈에 새길 '새로운 투자 원칙(교훈)' 1가지를 도출하십시오.

반드시 아래 JSON 스키마를 엄격히 준수하여 응답하십시오:
{
  "reflection": "과거 가설과 현재 현실의 차이, 뼈아픈 반성 또는 성과에 대한 마크다운 형태의 상세한 성찰 기록",
  "principle": "다음 분석 시 뇌에 장착할 1문장짜리 강력하고 명확한 새로운 투자 원칙 (예: '인플레이션 둔화 신호보다 고용 지표의 후행성을 더 무겁게 반영하라')"
}
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const text = response.text;
    if (!text) throw new Error('Empty response from Gemini');
    return JSON.parse(text);
  } catch (error) {
    console.error('Gemini Reflection API error:', error);
    throw error;
  }
}

export async function analyzeMacroData(macroData: any, etfData: any, newsData: any[], previousArchive?: any, lessons?: any[]) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not defined in environment variables');
  }

  const ai = new GoogleGenAI({ apiKey });

  const newsContext = newsData.map(n => `- ${n.title}`).join('\n');
  const lessonsContext = lessons && lessons.length > 0 
    ? lessons.slice(0, 5).map((l, i) => `${i+1}. [${l.date}의 교훈] ${l.principle}`).join('\n')
    : '아직 누적된 뼈아픈 교훈이 없습니다. 첫 분석을 신중하게 진행하십시오.';

  const prompt = `
당신은 하워드 막스(Howard Marks)의 가치투자 및 사이클 철학과 스탠리 드러켄밀러(Stanley Druckenmiller)의 탑다운 매크로 트렌드 추종 전략을 완벽하게 융합한 세계 최고의 최고투자책임자(CIO)입니다.
현재 시장의 실시간 데이터와 뉴스를 바탕으로, 시장의 과열/침체 사이클을 짚어내고(가치투자 관점), 동시에 뚜렷하게 형성되는 거시경제적 트렌드에 과감히 올라타는(트렌드 추종) 최적의 자산배분을 제안해야 합니다.

[AI의 성장 일지: 과거의 뼈아픈 실수와 진화된 원칙 (CRITICAL)]
다음은 당신이 과거에 오판하거나 놓쳤던 부분들에 대해 스스로 처절하게 반성하고 세운 원칙들입니다.
오늘 분석을 진행할 때 아래의 원칙들을 반드시 최우선으로 고려하여 동일한 실수를 절대 반복하지 마십시오:
${lessonsContext}

[포트폴리오 일관성 제약 조건 (CRITICAL)]
${previousArchive?.portfolio ? `당신이 가장 최근 결정한 포트폴리오 비중은 다음과 같습니다:
${JSON.stringify(previousArchive.portfolio, null, 2)}
**경고: 특별한 이유(예: 금리 정책의 급변, 실업률의 급격한 상승 등)가 없다면 위 비중과 단 1%도 다르지 않게 똑같은 숫자를 그대로 출력하십시오.** 
AI로서 매번 다른 답을 내놓으려는 습성을 버리십시오. 대가들은 노이즈에 휩쓸려 매일 포트폴리오를 갈아엎지 않습니다.` : `이전에 저장된 포트폴리오가 없습니다. 제로베이스에서 최적의 비중을 설계하십시오.`}

[현재 경제 지표 (FRED)]
- 10년물-2년물 장단기 금리차: ${macroData.yieldCurve}
- M2 유동성 (단위: 10억 달러): ${macroData.m2}
- 실업률: ${macroData.unemploymentRate}%

[현재 주요 ETF 데이터]
${JSON.stringify(etfData, null, 2)}

[최신 미국 경제 뉴스 헤드라인]
${newsContext}

[당신의 분석 프로세스 및 요구사항]
다음 4단계의 논리적 흐름에 따라 'explanation' 필드를 작성해야 합니다. 마크다운 문법을 적극 활용하세요.

1. 시장 사이클 및 트렌드 진단 (Howard Marks & Druckenmiller View)
2. 심층적 통찰 및 철학적 근거 (과거의 '교훈'을 바탕으로 과거보다 더 나은 2차적 사고 발휘)
3. 가치와 트렌드가 융합된 자산군 전략
4. ETF 추천의 당위성 및 비중 일관성에 대한 방어

[요청 사항]
아래 JSON 스키마에 맞추어 응답하십시오. (순수 JSON)
{
  "regime": "현재 경제 국면에 대한 짧고 임팩트 있는 명칭",
  "explanation": "위 4단계 분석 프로세스를 모두 거친, 마크다운 형식의 매우 깊이 있는 전문가용 XAI 리포트. 최소 1000자 이상, 3~4개의 소제목 포함.",
  "portfolio": [
    { "ticker": "XLK", "weight": 비중 },
    { "ticker": "XLV", "weight": 비중 },
    { "ticker": "XLE", "weight": 비중 },
    { "ticker": "XLF", "weight": 비중 },
    { "ticker": "XLI", "weight": 비중 },
    { "ticker": "XLY", "weight": 비중 },
    { "ticker": "XLP", "weight": 비중 }
  ],
  "recommended_papers": [
    { 
      "title": "논문 혹은 리서치 메모 제목", 
      "author": "저자명", 
      "summary": "단순 요약이 아닙니다! **무조건 최소 1500자 이상의 거대한 마크다운 리포트**로 작성하십시오. 이 논문의 핵심 철학, 시대적 배경, 그리고 현재 내 포트폴리오(비중)에 왜 완벽하게 부합하는지를 여러 개의 소제목(##)을 나누어 논문 한 편을 쓰듯 아주 깊고 길게 증명해야 합니다."
    }
  ],
  "tailored_news": [
    {
      "title": "현재 내 포트폴리오 비중과 직결된 중요한 뉴스 요약",
      "insight": "이 뉴스가 내 포지션에 어떤 영향을 미치는지에 대한 2차적 사고가 담긴 논평"
    }
  ]
}
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1, // 무작위성을 극한으로 낮춰 일관성 확보
      }
    });

    const text = response.text;
    if (!text) throw new Error('Empty response from Gemini');
    return JSON.parse(text);
  } catch (error) {
    console.error('Gemini API error:', error);
    throw error;
  }
}

export async function formatIBNews(newsList: any[]) {
  if (!newsList || newsList.length === 0) return [];
  
  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

  // Function to process a single news item
  const processNews = async (newsItem: any) => {
    const prompt = `
당신은 최고의 글로벌 매크로 분석가입니다.
사용자가 방금 월스트리트의 투자은행(${newsItem.ib || 'Wall Street IB'})과 관련된 최신 외신 뉴스를 가져왔습니다.

[뉴스 내용]
제목: ${newsItem.title}
출처: ${newsItem.publisher}
링크: ${newsItem.link}

[요청 사항]
위 뉴스에 대해 **300~500자 분량의 핵심 분석 리포트를 작성하십시오. (절대 1000자를 넘지 않도록 요약할 것)**

[작성 지침]
아래의 3가지 핵심 내용을 서술하십시오:
1. 상황 요약 (Context): 어떤 이슈가 발생했는지 (100~150자)
2. IB의 뷰 (Insight): 해당 IB는 이 사태를 어떻게 해석하고 어떤 포지션을 권고하는가? (150~250자)
3. 시장 파급 효과 (Impact): 이 뷰가 증시에 미칠 영향 (100~150자)
`;

    let retries = 3;
    let delay = 1000;

    while (retries > 0) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.3,
            responseSchema: {
              type: "OBJECT",
              properties: {
                ib_name: { type: "STRING", description: "관련 IB 기관명" },
                headline: { type: "STRING", description: "기사 헤드라인 (번역된 매력적인 제목)" },
                context: { type: "STRING", description: "상황 요약" },
                insight: { type: "STRING", description: "IB의 뷰 및 권고 포지션" },
                impact: { type: "STRING", description: "시장 파급 효과" },
                url: { type: "STRING", description: "원문 링크" }
              },
              required: ["ib_name", "headline", "context", "insight", "impact", "url"]
            }
          }
        });

        const text = response.text;
        if (!text) throw new Error('Empty response');
        const parsed = JSON.parse(text);
        parsed.url = newsItem.link; // Ensure URL is correct
        parsed.ib_name = newsItem.ib || parsed.ib_name;
        return parsed;
      } catch (error: any) {
        retries--;
        if (retries === 0) return null;
        await new Promise(res => setTimeout(res, delay));
        delay *= 2;
      }
    }
    return null;
  };

  // Process sequentially to avoid rate limits and 503 high demand
  const results = [];
  for (let i = 0; i < newsList.length; i++) {
    const item = newsList[i];
    const parsed = await processNews(item);
    if (parsed) {
      results.push(parsed);
    }
    // delay between items
    await new Promise(res => setTimeout(res, 2000));
  }

  return results;
}
