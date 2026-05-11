import { GoogleGenAI } from '@google/genai';

export async function analyzeKoreanStock(companyData: any, technicalReasons: string[]) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not defined in environment variables');
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
당신은 대한민국 최고의 가치투자자이자 기술적 트레이더인 '단테'와 '워렌 버핏'의 지식을 모두 갖춘 전설적인 펀드매니저입니다.
최근 당신의 1단계 퀀트 스크리닝 알고리즘이 특정 주식을 "기술적 매수 타점"으로 포착했습니다.
이제 당신은 이 주식의 "기본적 분석(Fundamental Analysis)과 모멘텀(재료) 분석"을 수행하여, 최종적으로 이 주식을 매수할지(BUY), 관망할지(HOLD), 버릴지(DROP) 결정해야 합니다.

[스크리닝 알고리즘이 포착한 기술적 매수 타점 근거]
${technicalReasons.map((r, i) => `${i + 1}. ${r}`).join('\n')}

[기업 펀더멘털 및 최신 뉴스 데이터 (네이버 금융)]
종목명/코드: ${companyData.ticker}
기업 개요: ${companyData.description}

재무 및 밸류에이션 지표:
- 시가총액: ${companyData.financials.marketCap}
- PER: ${companyData.financials.per}
- PBR: ${companyData.financials.pbr}
- EPS: ${companyData.financials.eps}
- BPS: ${companyData.financials.bps}
- 배당수익률: ${companyData.financials.dividendYield}
- 증권사 목표가 컨센서스: ${companyData.financials.consensusTarget}

최근 증권사 리포트 헤드라인:
${companyData.recentReports.map((r: any) => `- [${r.date}] ${r.title} (${r.broker})`).join('\n')}

최근 뉴스 헤드라인 (모멘텀 및 재료 파악용):
${companyData.newsHeadlines.map((h: string) => `- ${h}`).join('\n')}

[분석 요구사항]
다음 JSON 스키마를 엄격히 준수하여 매우 논리적이고 깊이 있는 리포트를 작성하십시오:
{
  "business_summary": "이 기업이 정확히 어떤 비즈니스를 통해 돈을 벌고 있는지, 산업 내 위치는 어떠한지 요약 (300자 내외)",
  "valuation_analysis": "PER, PBR, 시가총액 등의 재무 지표를 바탕으로 현재 주가가 고평가인지 저평가인지, 재무적 리스크(상장폐지 등)는 없는지 냉정하게 평가 (400자 내외)",
  "momentum_analysis": "최근 뉴스 및 리포트를 바탕으로 이 주가 상승을 견인할 '재료'나 '모멘텀'이 존재하는지, 향후 6개월 내 50% 상승을 이끌만한 테마에 엮여있는지 분석 (400자 내외)",
  "technical_synergy": "포착된 '기술적 매수 타점'과 '기본적/모멘텀 분석' 결과가 얼마나 시너지를 내는지 평가 (200자 내외)",
  "final_decision": "BUY, HOLD, DROP 중 택 1",
  "target_return_probability": "6개월 내 50% 이상 상승할 확률에 대한 주관적 퍼센트 (예: 75)",
  "action_plan": "구체적인 매수 비중, 손절 라인 등 액션 플랜 (200자 내외)"
}
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2, // 분석의 일관성을 위해 낮춤
      }
    });

    const text = response.text;
    if (!text) throw new Error('Empty response from Gemini');
    return JSON.parse(text);
  } catch (error) {
    console.error('Gemini Fundamental Analysis API error:', error);
    throw error;
  }
}

export async function analyzeExitSignal(companyData: any, alertReason: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not defined in environment variables');
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
당신은 이 5억 시뮬레이션 펀드를 총괄 운용하는 '전체 투자자(수석 펀드매니저)'입니다. 
이 보고서를 읽는 분은 당신을 전적으로 믿고 투자금을 맡긴 '쩐주(LP/투자자 대표님)'입니다.
방금 당신이 관리하던 포트폴리오 종목 중 하나가 '익절(목표가 도달)' 또는 '손절(위험 한도 이탈)' 조건에 도달했습니다.

[발생 사유 (익절 또는 손절)]
${alertReason}

[기업 펀더멘털 및 최신 뉴스 데이터]
종목명/코드: ${companyData.ticker}
기업 개요: ${companyData.description}

최근 뉴스 헤드라인 (모멘텀 및 악재 파악용):
${companyData.newsHeadlines.map((h: string) => `- ${h}`).join('\n')}

[분석 요구사항]
다음 JSON 스키마를 엄격히 준수하여 쩐주(대표님)께 보고할 기안서 형태의 [심층 매도/청산 보고서]를 작성하십시오. 예의 바르면서도 극도로 냉철하고 전문적인 월스트리트 펀드매니저의 톤앤매너를 유지하세요.

{
  "company_status": "현재 이 기업이 처한 펀더멘털 상황 및 최근 뉴스 플로우 요약 (300자 내외)",
  "sell_reason": "이번에 시스템이 매도(익절/손절) 신호를 발생시킨 논리적 이유와 정당성 (300자 내외)",
  "technical_impact": "현재 차트상 위치 및 향후 주가 변동성 예상 (200자 내외)",
  "final_decision": "SELL (전량 매도 확정), REDUCE (절반만 매도하고 지켜볼 것 건의), HOLD (노이즈에 불과하므로 매도 취소 건의) 중 택 1",
  "action_plan": "쩐주(대표님)께 올리는 최종 코멘트 및 향후 투자금 재배치 전략 (200자 내외)"
}
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      }
    });

    const text = response.text;
    if (!text) throw new Error('Empty response from Gemini');
    return JSON.parse(text);
  } catch (error) {
    console.error('Gemini Sell Analysis API error:', error);
    throw error;
  }
}
