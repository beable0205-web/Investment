import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function runMonthlyEvolution() {
  console.log('============================================');
  console.log('🧬 월간 AI 자가 진화 (Self-Evolution) 엔진 가동 중...');
  console.log('============================================');

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not defined');

  const ai = new GoogleGenAI({ apiKey });

  // Dynamic imports
  const { getMacroIndicators } = await import('../src/lib/data/fred');
  const { initPortfolio } = await import('../src/lib/simulation');

  // 1. 데이터 수집 (매크로, 포트폴리오 성과)
  const macroData = await getMacroIndicators();
  const portfolio = initPortfolio();
  
  const initialCash = 100000;
  const totalReturn = ((portfolio.totalEquity - initialCash) / initialCash) * 100;
  const winCount = portfolio.history.filter(h => h.roi > 0).length;
  const lossCount = portfolio.history.filter(h => h.roi <= 0).length;
  const winRate = portfolio.history.length > 0 ? (winCount / portfolio.history.length) * 100 : 0;

  console.log(`📊 현재 누적 수익률: ${totalReturn.toFixed(2)}% | 승률: ${winRate.toFixed(2)}%`);
  console.log(`🌐 현재 매크로 상황: 장단기 금리차(${macroData.yieldCurve}%), 실업률(${macroData.unemploymentRate}%)`);

  // 2. 진화 프롬프트 작성 (Reinforcement Learning Prompt)
  const prompt = `
당신은 최고의 퀀트 트레이더이자 단테 기법을 완벽하게 체화한 AI 시스템입니다.
현재까지 봇이 "밥그릇 3번 자리" 및 "매집봉" 기법으로 가상 매매를 진행한 지난 달의 성과 데이터와, 
현재 시장의 거시경제(Macro) 데이터가 주어집니다.

[포트폴리오 성과 요약]
- 총 자산: $${portfolio.totalEquity.toFixed(2)} (초기 자본: $100,000)
- 누적 수익률: ${totalReturn.toFixed(2)}%
- 총 매매 횟수: ${portfolio.history.length} (익절: ${winCount}, 손절: ${lossCount}, 승률: ${winRate.toFixed(2)}%)
- 최근 손절 내역:
${portfolio.history.filter(h => h.roi <= 0).slice(-5).map(h => `  - ${h.ticker}: ${h.roi.toFixed(2)}% 손실 (${h.reason})`).join('\n') || '  (없음)'}

[현재 미국 거시경제(Macro) 지표 - FRED 데이터]
- 장단기 금리차 (10Y-2Y): ${macroData.yieldCurve}%
- 실업률: ${macroData.unemploymentRate}%
- M2 통화량: ${macroData.m2} Billion USD

요청 사항:
위 데이터를 철저하게 분석하여, 이번 달 알고리즘의 성과를 복기하고 다음 달 매매에 적용할 "진화된 룰(교훈)"을 도출하십시오.
특히, 기술적 분석 기법이 매크로 상황(예: 역전된 금리차, 상승하는 실업률 등)에서 어떻게 영향을 받았는지 심층적으로 분석하여 전략(비중 축소, 손절 라인 타이트화 등)을 수정하십시오.

JSON 형태로만 반환하세요:
{
  "date": "${new Date().toISOString().split('T')[0]}",
  "principle": "다음 달에 당장 적용할 한 줄짜리 핵심 원칙 (예: 매크로 침체 우려가 있으니 밥그릇 돌파 확인 후 손절선을 -3%로 상향한다)",
  "reflection": "현재 성과와 매크로 지표를 분석한 자기 성찰 (마크다운 형식, 최소 3문단 이상의 심층 분석)"
}
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.3
      }
    });

    const result = JSON.parse(response.text || '{}');
    
    // 3. 교훈 아카이브 저장
    const archiveDir = path.join(process.cwd(), 'src', 'data', 'archive');
    if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir, { recursive: true });
    
    const lessonsPath = path.join(archiveDir, 'lessons.json');
    let lessons = [];
    if (fs.existsSync(lessonsPath)) {
      lessons = JSON.parse(fs.readFileSync(lessonsPath, 'utf-8'));
    }
    
    lessons.push(result);
    fs.writeFileSync(lessonsPath, JSON.stringify(lessons, null, 2));

    console.log(`\n✅ 성공적으로 교훈(Lesson)이 도출되었습니다!`);
    console.log(`📌 도출된 원칙: ${result.principle}`);
    console.log(`이제 대시보드 하단의 'AI 진화 일지'에 이 내용이 반영됩니다.`);

  } catch (error) {
    console.error('AI 진화 엔진 실행 중 오류 발생:', error);
  }
}

if (require.main === module || process.argv[1].endsWith('monthly_evolution.ts')) {
  runMonthlyEvolution().catch(err => {
    console.error(err);
  });
}
