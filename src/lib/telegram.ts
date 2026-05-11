import TelegramBot from 'node-telegram-bot-api';

let bot: TelegramBot | null = null;
let token = '';
let chatId = '';

function initBot() {
  if (bot) return;
  token = process.env.TELEGRAM_BOT_TOKEN || '';
  chatId = process.env.TELEGRAM_CHAT_ID || '';
  
  if (token) {
    bot = new TelegramBot(token, { polling: false });
  } else {
    console.warn('TELEGRAM_BOT_TOKEN is not defined in .env.local');
  }
}

export async function sendTelegramMessage(message: string) {
  initBot();
  if (!bot || !chatId) {
    console.warn('텔레그램 봇 토큰이나 CHAT_ID가 없어서 메시지를 전송하지 못했습니다.');
    console.log('--- 전송 예정이던 메시지 ---');
    console.log(message);
    return false;
  }

  try {
    await bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
    console.log('✅ 텔레그램 메시지 전송 완료');
    return true;
  } catch (err) {
    console.error('텔레그램 전송 실패:', err);
    return false;
  }
}
export async function sendTelegramDocument(filePath: string, caption?: string) {
  initBot();
  if (!bot || !chatId) {
    console.warn('텔레그램 봇 토큰이나 CHAT_ID가 없어서 문서를 전송하지 못했습니다.');
    return false;
  }

  try {
    await bot.sendDocument(chatId, filePath, { caption, parse_mode: 'HTML' });
    console.log('✅ 텔레그램 문서 전송 완료');
    return true;
  } catch (err) {
    console.error('텔레그램 문서 전송 실패:', err);
    return false;
  }
}

export function startTelegramListener() {
  token = process.env.TELEGRAM_BOT_TOKEN || '';
  chatId = process.env.TELEGRAM_CHAT_ID || '';
  
  if (!token || !chatId) {
    console.warn('텔레그램 봇 토큰이나 CHAT_ID가 없어 리스너를 시작할 수 없습니다.');
    return;
  }

  // 기존 폴링 끄고 새 인스턴스 생성 (충돌 방지)
  bot = new TelegramBot(token, { polling: true });
  console.log('🤖 텔레그램 봇 리스너(수동 컨트롤) 시작됨...');

  bot.onText(/\/(.+)/, async (msg, match) => {
    if (msg.chat.id.toString() !== chatId) {
      console.warn(`[보안 경고] 비인가 사용자의 접근 시도: ${msg.chat.id}`);
      return;
    }

    if (!match) return;
    const commandText = match[1].trim();
    const parts = commandText.split(' ');
    const command = parts[0];
    const ticker = parts[1];

    if (command === '현황') {
      import('fs').then(fs => {
        import('path').then(path => {
          const dbPath = path.join(process.cwd(), 'src', 'data', 'kr_tracked_stocks.json');
          if (fs.existsSync(dbPath)) {
            const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
            const tracking = db.stocks?.filter((s: any) => s.status === 'TRACKING') || [];
            let report = `💼 <b>[펀드매니저 보고] 현재 포트폴리오 현황</b>\n\n`;
            report += `💰 보유 현금: ${(db.account?.cash || 0).toLocaleString()}원\n`;
            report += `📈 확정 수익: ${(db.account?.totalRealizedProfit || 0).toLocaleString()}원\n\n`;
            report += `📊 <b>보유 종목 (${tracking.length}/10)</b>\n`;
            
            if (tracking.length === 0) {
              report += `현재 편입된 종목이 없습니다.`;
            } else {
              tracking.forEach((s: any) => {
                const currentROI = s.unrealizedROI ? `${s.unrealizedROI > 0 ? '+' : ''}${s.unrealizedROI.toFixed(2)}%` : '0%';
                report += `▪️ ${s.companyName} (${s.ticker})\n`;
                report += `   └ 수익률: ${currentROI} / 평단: ${s.entryPrice.toLocaleString()}원\n`;
              });
            }
            bot?.sendMessage(chatId, report, { parse_mode: 'HTML' });
          } else {
            bot?.sendMessage(chatId, '데이터베이스 파일이 존재하지 않습니다.');
          }
        });
      });
      return;
    }

    if (command === '매수') {
      if (!ticker) {
        bot!.sendMessage(chatId, '❌ 종목 코드를 함께 입력해주세요. (예: /매수 005930)');
        return;
      }
      bot!.sendMessage(chatId, `⏳ ${ticker} 종목 수동 매수 지시를 수신했습니다. 집행 중...`);
      import('../app/kr-portfolio/actions').then(async ({ manualBuy }) => {
        const res = await manualBuy(ticker);
        bot?.sendMessage(chatId, res.success ? `✅ ${res.message}` : `❌ ${res.message}`);
      }).catch(err => {
        bot?.sendMessage(chatId, `❌ 매수 실행 중 시스템 오류: ${err.message}`);
      });
      return;
    }

    if (command === '매도') {
      if (!ticker) {
        bot!.sendMessage(chatId, '❌ 종목 코드를 함께 입력해주세요. (예: /매도 005930)');
        return;
      }
      bot!.sendMessage(chatId, `⏳ ${ticker} 종목 수동 매도 지시를 수신했습니다. 청산 중...`);
      import('../app/kr-portfolio/actions').then(async ({ manualSell }) => {
        import('fs').then(fs => {
          import('path').then(async path => {
            const dbPath = path.join(process.cwd(), 'src', 'data', 'kr_tracked_stocks.json');
            if (!fs.existsSync(dbPath)) return;
            const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
            const stock = db.stocks?.find((s: any) => s.ticker.includes(ticker) && s.status === 'TRACKING');
            
            if (!stock) {
              bot?.sendMessage(chatId, `❌ 포트폴리오에서 [${ticker}] 종목을 찾을 수 없습니다.`);
              return;
            }
            const res = await manualSell(stock.ticker);
            bot?.sendMessage(chatId, res.success ? `✅ ${res.message}` : `❌ ${res.message}`);
          });
        });
      }).catch(err => {
        bot?.sendMessage(chatId, `❌ 매도 실행 중 시스템 오류: ${err.message}`);
      });
      return;
    }

    bot!.sendMessage(chatId, `⚠️ 알 수 없는 명령어입니다.\n사용 가능 명령어: /현황, /매수 [종목코드], /매도 [종목코드]`);
  });
}
