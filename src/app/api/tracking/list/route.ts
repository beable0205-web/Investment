import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
let yahooFinance: any;
try {
  yahooFinance = require('yahoo-finance2').default;
  if (typeof yahooFinance === 'function') {
    yahooFinance = new yahooFinance();
  }
} catch (e) {
  yahooFinance = require('yahoo-finance2');
}

const FILE_PATH = path.join(process.cwd(), 'src', 'data', 'archive', 'tracked_stocks.json');

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    if (!fs.existsSync(FILE_PATH)) {
      return NextResponse.json({ success: true, data: [] });
    }

    const fileData = fs.readFileSync(FILE_PATH, 'utf-8');
    const stocks: any[] = JSON.parse(fileData);

    if (stocks.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    // 야후 파이낸스에서 실시간/최근 주가 가져오기
    const tickers = stocks.map(s => s.ticker);
    
    // 복수 조회
    let quotes: any = [];
    try {
      quotes = await yahooFinance.quote(tickers);
    } catch (e) {
      console.error('Yahoo Finance Quote Error:', e);
      // 에러 발생 시 부분 처리나 캐싱된 데이터 사용을 고려할 수 있으나, 여기선 배열로 래핑
      quotes = [];
    }

    // 배열이 아닐 경우 배열로 변환 (한 개 종목만 조회할 때)
    if (!Array.isArray(quotes)) {
      quotes = [quotes];
    }

    const quoteMap = new Map();
    quotes.forEach((q: any) => {
      quoteMap.set(q.symbol, q);
    });

    const enrichedStocks = stocks.map(stock => {
      const q = quoteMap.get(stock.ticker);
      const currentPrice = q ? q.regularMarketPrice : stock.discoveryPrice; // 시세를 못 가져오면 발굴가로 대체
      
      const roi = ((currentPrice - stock.discoveryPrice) / stock.discoveryPrice) * 100;

      return {
        ...stock,
        currentPrice,
        roi: parseFloat(roi.toFixed(2)),
        changePercent: q ? q.regularMarketChangePercent : 0
      };
    });

    // 수익률 내림차순 정렬
    enrichedStocks.sort((a, b) => b.roi - a.roi);

    return NextResponse.json({ success: true, data: enrichedStocks });
  } catch (err: any) {
    console.error('Tracking List Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
