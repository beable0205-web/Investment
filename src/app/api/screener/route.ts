import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function GET(req: Request) {
  try {
    const filePath = path.join(process.cwd(), 'src', 'data', 'archive', 'daily_screener_matches.json');

    // 1. 파일이 존재하는지 확인 (백그라운드 스캐너가 실행되었는지)
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ 
        success: false, 
        error: '백그라운드 스캐닝 결과 파일이 없습니다. 터미널에서 npm run scan 을 먼저 실행해 주세요.'
      }, { status: 400 });
    }

    const fileData = fs.readFileSync(filePath, 'utf-8');
    const cachedData = JSON.parse(fileData);
    const matchedStocks = cachedData.matches || [];

    if (matchedStocks.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: '오늘자 전 종목(2,500+) 스크리닝을 돌렸으나, 조건에 부합하는 종목이 한 개도 없습니다.',
        data: [],
        count: 0,
        matches: []
      });
    }

    // 2. 2차 제미나이 정성 평가 (보고서 생성)
    const prompt = `
당신은 월스트리트 출신의 대한민국 최고 미국 주식(NASDAQ, NYSE) 트레이딩 마스터입니다.
아래는 오늘 자 '기술적 분석 스크리닝 알고리즘 (전 종목 백그라운드 스캔)'에 의해 1차적으로 포착된 미국 주식 종목 리스트입니다.
각 종목의 포착 이유를 보고, 세력의 매집, 지지와 저항, 거래량 패턴 관점에서 심층 분석을 진행해 주세요.

포착된 종목 데이터:
${JSON.stringify(matchedStocks, null, 2)}

요청 사항:
1. 각 종목에 대해 포착된 이유(Rule)가 왜 승률이 높은 타점인지 기술적 분석 철학에 기반해 설명하세요. (미 증시의 풍부한 유동성 및 상하한가 없는 특성 고려)
2. 각 종목에 대한 단기 매수 타점, 1차 목표가, 절대 이탈하면 안 되는 칼손절가(예: 224일선 이탈 등)를 명확히 제시하세요.
3. 결과를 마크다운 포맷의 전문적인 리포트로 작성하세요. 표(Table)를 활용해 목표가와 손절가를 깔끔하게 정리해 주세요.
4. 리포트의 톤앤매너는 냉철하고 직관적인 '월스트리트 기관 트레이더' 스타일이어야 합니다.
`;

    let aiReport = '';
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: { temperature: 0.2 }
      });
      aiReport = response.text || '';
    } catch (modelErr: any) {
      console.warn('gemini-2.5-pro failed, falling back to gemini-2.5-flash:', modelErr.message);
      try {
        const fallbackResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: { temperature: 0.2 }
        });
        aiReport = fallbackResponse.text || '';
      } catch (fallbackErr: any) {
        throw new Error('AI 서버에 일시적인 트래픽 폭주가 발생했습니다(503). 1~2분 뒤에 다시 버튼을 눌러주세요.');
      }
    }

    return NextResponse.json({ 
      success: true, 
      count: matchedStocks.length,
      matches: matchedStocks.map((m: any) => m.companyName),
      report: aiReport,
      rawMatches: matchedStocks // 프론트엔드에서 데이터 테이블로 보여주기 위함
    });

  } catch (err: any) {
    console.error('Screener API Error:', err);
    // Return friendly error directly
    return NextResponse.json({ success: false, error: err.message || '알 수 없는 오류가 발생했습니다.' }, { status: 500 });
  }
}
