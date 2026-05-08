import { NextResponse } from 'next/server';
import { runBacktest } from '@/lib/backtest';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ticker = searchParams.get('ticker');
  
  if (!ticker) {
    return NextResponse.json({ success: false, error: 'Ticker is required' }, { status: 400 });
  }

  try {
    const result = await runBacktest(ticker, 1825); // 5년
    if (!result) {
      return NextResponse.json({ success: false, error: '데이터가 충분하지 않거나 종목을 찾을 수 없습니다.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    console.error('Backtest API Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
