import TelegramBot from 'node-telegram-bot-api';

let bot: TelegramBot | null = null;
const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

if (token) {
  bot = new TelegramBot(token, { polling: false });
} else {
  console.warn('TELEGRAM_BOT_TOKEN is not defined in .env.local');
}

export async function sendTelegramMessage(message: string) {
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
