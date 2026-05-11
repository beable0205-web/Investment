import cron from 'node-cron';
import { runDailyTopStock } from './daily_top_stock';

console.log('⏳ 자율주행 투자 스케줄러가 시작되었습니다.');
console.log(' - 설정 시간: 매주 화~토요일 오전 6시 15분 KST (미국장 마감 후)');

cron.schedule('15 6 * * 2-6', async () => {
  console.log('⏰ 미국장 마감 스케줄러 작동: 오늘의 주식 발굴 및 포트폴리오 관리를 시작합니다...');
  try {
    await runDailyTopStock();
    console.log('✅ 당일 스케줄러 작업이 무사히 완료되었습니다.');
  } catch (err) {
    console.error('❌ 스케줄러 실행 중 오류 발생:', err);
  }
}, {
  scheduled: true,
  timezone: 'Asia/Seoul'
});

// 프로세스가 죽지 않도록 유지
process.on('SIGINT', () => {
  console.log('\n스케줄러를 종료합니다.');
  process.exit();
});
