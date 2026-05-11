import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { getStockData, evaluateRules } from '../src/lib/screener';
import { initPortfolio, dailySettlement, executeBuy, savePortfolio } from '../src/lib/simulation';
import { GoogleGenAI } from '@google/genai';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// 텔레그램 알림 전송 함수
async function sendTelegramMessage(message: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.warn('텔레그램 토큰 또는 Chat ID가 설정되지 않아 알림을 전송하지 않습니다.');
    return;
  }
  
  try {
    const cleanToken = token.replace(/"/g, '');
    const cleanChatId = chatId.replace(/"/g, '');
    const url = `https://api.telegram.org/bot${cleanToken}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: cleanChatId,
        text: message,
        parse_mode: 'HTML'
      })
    });
    if (!res.ok) throw new Error(await res.text());
    console.log('✅ 텔레그램 알림 전송 완료!');
  } catch (err: any) {
    console.error('❌ 텔레그램 전송 실패:', err.message);
  }
}

// SEC에서 전체 티커 목록 가져오기
async function fetchAllUSTickers(): Promise<string[]> {
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
    return all.filter(t => /^[A-Z\-]+$/.test(t));
  } catch (error) {
    console.warn('Failed to fetch SEC list. Using default.');
    return ['AAPL', 'MSFT', 'NVDA', 'AMZN'];
  }
}

// 1단계: 기술적 분석으로 차트 좋은 놈 찾기
async function technicalScreening(tickers: string[]) {
  console.log(`\n[Step 1] 전체 ${tickers.length}개 종목 대상 기술적 스크리닝 시작...`);
  const matched: any[] = [];
  const CHUNK_SIZE = 10;
  let processed = 0;

  for (let i = 0; i < tickers.length; i += CHUNK_SIZE) {
    const chunk = tickers.slice(i, i + CHUNK_SIZE);
    const promises = chunk.map(async (ticker) => {
      try {
        const data = await getStockData(ticker, 500);
        if (data && data.length > 224) {
          const lastClose = data[data.length - 1].close;
          if (lastClose >= 5) { // 5불 이상
            const matchResult = evaluateRules(ticker, data, ticker);
            // Rule 4 (당일 급등타점) 또는 Rule 3 (역주행 캔들 초입) 만 집중 필터링
            if (matchResult && matchResult.matchReasons.some((r: string) => r.includes('Rule 4') || r.includes('Rule 3'))) {
              return matchResult;
            }
          }
        }
      } catch (e) {}
      return null;
    });

    const results = await Promise.all(promises);
    results.forEach(res => {
      if (res) matched.push(res);
    });

    processed += chunk.length;
    if (processed % 100 === 0 || processed >= tickers.length) {
      console.log(`[기술적 스캔] ${Math.min(processed, tickers.length)} / ${tickers.length} 완료... (현재 합격: ${matched.length}개)`);
    }

    // 야후 파이낸스 차단 방지
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return matched;
}

// 2단계: 펀더멘털 필터링
function fundamentalFiltering(techStocks: any[]) {
  console.log(`\n[Step 2] 기술적 합격 종목 ${techStocks.length}개 대상 펀더멘털 DB(지뢰 제거) 크로스체크...`);
  const fundamentalsDir = path.join(process.cwd(), 'src', 'data', 'fundamentals');
  const passedStocks: any[] = [];

  for (const stock of techStocks) {
    const fundamentalPath = path.join(fundamentalsDir, `${stock.ticker}.json`);
    
    if (!fs.existsSync(fundamentalPath)) {
      console.log(`- [탈락] ${stock.ticker}: 펀더멘털 데이터 부재 (아직 수집안됨)`);
      continue;
    }

    const fundamentalData = JSON.parse(fs.readFileSync(fundamentalPath, 'utf-8'));
    if (fundamentalData.isInvestable === false) {
      console.log(`- [탈락] ${stock.ticker}: 투자 불가 종목`);
      continue;
    }

    const tags = fundamentalData.analysis?.ai_system_tags || [];
    const traits = fundamentalData.analysis?.fundamental_traits || {};
    const profitability = traits.profitability || '';

    if (profitability.includes('자본잠식') || tags.includes('Bankruptcy Risk')) {
      console.log(`- [탈락] ${stock.ticker}: 자본잠식/상장폐지 위험`);
      continue;
    }

    // 적자 기업의 경우, '턴어라운드'나 '고성장' 모멘텀 없으면 컷
    if (profitability.includes('적자') && !tags.includes('Turnaround') && !tags.includes('High-Growth')) {
      console.log(`- [탈락] ${stock.ticker}: 가망 없는 적자 기업`);
      continue;
    }

    console.log(`+ [합격] ${stock.ticker}: 펀더멘털 안전 (태그: ${tags.join(', ')})`);
    passedStocks.push({
      ...stock,
      fundamentalData
    });
  }

  return passedStocks;
}

// 3단계: AI 심층 분석
async function aiDeepAnalysis(finalCandidates: any[]) {
  console.log(`\n[Step 3] 최종 정예 ${finalCandidates.length}개 대상 AI 심층 분석 및 1등 종목 선정...`);
  if (finalCandidates.length === 0) {
    console.log('최종 후보가 없습니다. 오늘은 매수하지 않습니다.');
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not defined');
  const ai = new GoogleGenAI({ apiKey });

  let prompt = `당신은 월스트리트 최고의 트레이더이자, 서울대학교 투자동아리(SMIC) 수석 애널리스트입니다. 아래 리스트는 오늘 당장 기술적 타점(폭발적 거래량, 이평선 돌파)이 발생했고, 펀더멘털도 안전한 최정예 후보들입니다.\n\n`;
  finalCandidates.forEach((s, idx) => {
    prompt += `후보 ${idx + 1}: ${s.ticker}\n`;
    prompt += `- 기술적 타점: ${s.matchReasons.join(' / ')}\n`;
    prompt += `- 현재가: $${s.close}\n`;
    prompt += `- AI 펀더멘털 태그: ${s.fundamentalData.analysis?.ai_system_tags?.join(', ')}\n`;
    prompt += `- 비즈니스 해자: ${s.fundamentalData.analysis?.business_moat}\n\n`;
  });

  prompt += `이 중에서 현재 거시경제 매크로 상황을 고려했을 때, '오늘 당장 매수하기 가장 좋은 단 1개의 주식'을 고르고 아래 JSON 형식으로 응답해주세요.

선정 이유(rationale)는 우리의 기술적 룰(특히 Rule 4: 당일 거래량 폭발 및 이격도 안전, Rule 1: 밥그릇 3번 자리, Rule 3: 역주행 장대양봉 등)에 어떻게 완벽하게 부합하는지 기술적 근거를 바탕으로 명확히 서술해야 합니다.

추가로, 해당 기업의 심층 기본적 분석을 'SMIC 리서치 보고서' 양식(기업 개요, 투자 포인트, 산업 분석, 리스크 요소, 밸류에이션)에 맞춰서 깔끔한 HTML 형식(body 태그 내부만, 가독성 좋은 인라인 CSS 스타일 포함)으로 작성하여 'smic_html_report' 필드에 넣어주세요.

{
  "best_stock_ticker": "TICKER",
  "buy_price": 현재가 근처의 매수 진입가,
  "target_price": 단기/스윙 목표가,
  "stop_loss": 손절가 (매수가 대비 -5% ~ -10%),
  "should_buy": true/false (실제 포트폴리오에 편입할 가치가 있는지 판단),
  "conviction_score": 0~100 (확신도 점수. 매우 강력한 확신은 90~100, 애매하면 50 이하 지정),
  "rationale": "Rule 1~4를 기반으로 한 구체적이고 논리적인 선정 사유 (3~4문장)",
  "smic_html_report": "<div style='font-family: sans-serif; line-height: 1.6;'><h1>[TICKER] SMIC 심층 기업분석</h1>...</div>"
}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2
      }
    });

    const result = JSON.parse(response.text || '{}');
    console.log('\n============================================');
    console.log('🏆 [오늘의 주식 1등]');
    console.log(`- 종목명: ${result.best_stock_ticker}`);
    console.log(`- 매수가: $${result.buy_price}`);
    console.log(`- 목표가: $${result.target_price}`);
    console.log(`- 손절가: $${result.stop_loss}`);
    console.log(`- 확신도: ${result.conviction_score}점 / 매수 여부: ${result.should_buy ? '매수 진행' : '패스'}`);
    console.log(`- 추천 사유: ${result.rationale}`);
    console.log('============================================');
    
    const archiveDir = path.join(process.cwd(), 'src', 'data', 'archive');
    if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir, { recursive: true });
    
    // JSON 아카이브 저장
    const resultPath = path.join(archiveDir, 'daily_top_stock.json');
    fs.writeFileSync(resultPath, JSON.stringify({
      date: new Date().toISOString(),
      candidates: finalCandidates.map(c => c.ticker),
      pick: result
    }, null, 2));

    // SMIC HTML 리포트 저장
    const dateStr = new Date().toISOString().split('T')[0];
    const htmlPath = path.join(archiveDir, `${result.best_stock_ticker}_SMIC_Report_${dateStr}.html`);
    fs.writeFileSync(htmlPath, result.smic_html_report, 'utf-8');
    console.log(`✅ SMIC 리포트 저장 완료: ${htmlPath}`);

    // 실전 모의투자 로직 연동
    const currentDate = new Date().toISOString().split('T')[0];
    const p = initPortfolio(500000);
    const currentPrices: Record<string, number> = {};
    for (const pos of p.positions) {
      try {
        const d = await getStockData(pos.ticker, 5);
        if (d && d.length > 0) currentPrices[pos.ticker] = d[d.length - 1].close;
      } catch (e) {}
    }
    
    const updatedPortfolio = dailySettlement(currentDate, currentPrices);
    let portfolioAction = '보류 (확신도 부족)';

    if (result.should_buy && result.conviction_score >= 50) {
      const maxAllocation = 100000;
      const targetInvestAmount = maxAllocation * (result.conviction_score / 100);
      const success = executeBuy(updatedPortfolio, result.best_stock_ticker, result.best_stock_ticker, result.buy_price, result.rationale, currentDate, targetInvestAmount);
      
      if (success) {
        portfolioAction = `$${targetInvestAmount.toLocaleString()} 규모 편입 완료`;
        console.log(`💼 [모의투자] ${result.best_stock_ticker} 종목 ${portfolioAction}!`);
      } else {
        portfolioAction = '매수 실패 (잔고 부족 또는 이미 보유)';
        console.log(`💼 [모의투자] ${portfolioAction}.`);
      }
      savePortfolio(updatedPortfolio);
    } else {
      console.log(`💼 [모의투자] AI 판단 결과 당일 매수 기준 미달로 편입을 보류합니다.`);
      savePortfolio(updatedPortfolio);
    }

    // 텔레그램 메시지 전송
    const telegramMessage = `🚨 <b>오늘의 1등 추천 주식: ${result.best_stock_ticker}</b> 🚨\n\n` +
      `💰 <b>매수가:</b> $${result.buy_price}\n` +
      `🎯 <b>목표가:</b> $${result.target_price}\n` +
      `🛑 <b>손절가:</b> $${result.stop_loss}\n` +
      `📊 <b>AI 확신도:</b> ${result.conviction_score}점\n` +
      `🤖 <b>포트폴리오 액션:</b> ${portfolioAction}\n\n` +
      `📝 <b>선정 사유 (Technical Rules 기반):</b>\n${result.rationale}\n\n` +
      `※ 상세 SMIC 기업 분석 리포트(HTML)가 로컬에 저장되었습니다.`;
    
    await sendTelegramMessage(telegramMessage);

  } catch (err: any) {
    console.error('AI 분석 실패:', err.message);
  }
}

export async function runDailyTopStock() {
  const tickers = await fetchAllUSTickers();
  
  // 전체 스캔은 10~15분 소요.
  const techStocks = await technicalScreening(tickers);
  const fundamentallySoundStocks = fundamentalFiltering(techStocks);
  await aiDeepAnalysis(fundamentallySoundStocks);
}

if (require.main === module || process.argv[1].endsWith('daily_top_stock.ts')) {
  runDailyTopStock().catch(console.error);
}
