@echo off
echo ==================================================
echo AI 자율주행 투자 봇 실행 중... (백그라운드)
echo ==================================================
cd /d d:\투자ai멘토
echo [1/2] 포트폴리오 매도 조건 검사 중... >> d:\투자ai멘토\src\data\archive\auto_trade_log.txt
npx tsx scripts/daily_portfolio_check.ts >> d:\투자ai멘토\src\data\archive\auto_trade_log.txt 2>&1
echo [2/2] 신규 주도주 발굴 스크리닝 중... >> d:\투자ai멘토\src\data\archive\auto_trade_log.txt
npx tsx scripts/daily_top_stock.ts >> d:\투자ai멘토\src\data\archive\auto_trade_log.txt 2>&1
