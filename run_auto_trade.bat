@echo off
echo ==================================================
echo AI 자율주행 투자 봇 실행 중... (백그라운드)
echo ==================================================
cd /d d:\투자ai멘토
npx tsx scripts/daily_top_stock.ts >> d:\투자ai멘토\src\data\archive\auto_trade_log.txt 2>&1
