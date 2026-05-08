import * as dotenv from 'dotenv';
import path from 'path';
import cron from 'node-cron';
import { runDailyScreener } from './run_daily_screener';
import { sendTelegramMessage } from '../src/lib/telegram';
import { GoogleGenAI } from '@google/genai';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

async function executeMorningBriefing() {
  console.log('🤖 [Cron] 매일 아침 모닝 브리핑 자동화 프로세스 시작...');
  
  try {
    // 1. S&P 500 전 종목 백그라운드 스캐닝 실행
    const matchedStocks = await runDailyScreener();
    
    if (!matchedStocks || matchedStocks.length === 0) {
      await sendTelegramMessage(`📊 [투자 AI 멘토 모닝 브리핑]\n\n오늘은 기술적 분석 조건(224일선, 엔벨롭 등)에 부합하는 S&P 500 종목이 포착되지 않았습니다.\n휴식을 취하며 시장을 관망하세요.`);
      return;
    }

    // 2. Gemini AI 정성 평가 리포트 생성
    const prompt = `
당신은 월스트리트 출신의 대한민국 최고 미국 주식(NASDAQ, NYSE) 트레이딩 마스터입니다.
아래는 오늘 자 '기술적 분석 스크리닝 알고리즘'에 의해 포착된 미국 주식 종목 리스트입니다.

포착된 종목 데이터:
${JSON.stringify(matchedStocks, null, 2)}

요청 사항:
1. 각 종목에 대해 포착된 이유(Rule)가 왜 승률이 높은 타점인지 설명하세요.
2. 단기 매수 타점, 1차 목표가, 절대 이탈하면 안 되는 칼손절가를 명확히 제시하세요.
3. 텔레그램 메시지로 바로 전송할 것이므로, 마크다운 표가 아닌 가독성 좋은 텍스트(이모지 활용) 위주로 깔끔하고 간결하게 작성해 주세요. (길지 않게 핵심만 전달)
4. 냉철하고 직관적인 '월스트리트 기관 트레이더' 스타일을 유지하세요.
    `;

    let aiReport = '';
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: { temperature: 0.2 }
      });
      aiReport = response.text || '';
    } catch (e: any) {
      console.warn('Pro 모델 에러, Flash로 우회합니다.');
      const fallbackResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { temperature: 0.2 }
      });
      aiReport = fallbackResponse.text || '';
    }

    // 3. 텔레그램 전송
    const telegramMessage = `🚀 [투자 AI 멘토 모닝 브리핑]\n\n🎯 오늘 포착된 S&P 500 우량주 타점 리포트입니다.\n\n${aiReport}\n\n👉 웹 대시보드에서 트래킹 포트폴리오에 추가하세요.`;
    
    await sendTelegramMessage(telegramMessage);
    console.log('🤖 [Cron] 모닝 브리핑 텔레그램 전송 완벽하게 성공!');
    
  } catch (err) {
    console.error('Cron job 실행 중 오류 발생:', err);
    await sendTelegramMessage(`⚠️ 모닝 브리핑 실행 중 서버 에러가 발생했습니다.`);
  }
}

// 매일 오전 6시에 실행 (서버 시간 기준, 한국 시간 오후 2/3시쯤 될 수도 있으므로 서버 timezone 주의)
// 0 6 * * * -> 매일 오전 6시
cron.schedule('0 6 * * *', () => {
  executeMorningBriefing();
});

console.log('✅ 크론 스케줄러가 활성화되었습니다. 매일 아침 자동으로 텔레그램 브리핑을 발송합니다.');

// 개발 모드 테스트 시 즉시 한 번 실행하려면 아래 주석 해제
// executeMorningBriefing();
