import { NextResponse } from 'next/server';
import { getUSAccountBalance } from '@/lib/broker/kisApi';

export async function GET() {
  try {
    // KIS API가 환경변수에 셋팅되지 않았을 때 모의 데이터 반환 (UI 확인용)
    if (!process.env.KIS_APP_KEY) {
      return NextResponse.json({
        success: true,
        mock: true,
        data: {
          balance: 10000,
          holdings: [
            { ticker: 'AAPL', qty: 10, avgPrice: 150, currentPrice: 165, roi: 10.0 },
            { ticker: 'TSLA', qty: 5, avgPrice: 200, currentPrice: 180, roi: -10.0 },
          ]
        }
      });
    }

    const accountInfo = await getUSAccountBalance();
    
    if (accountInfo.rt_cd !== '0') {
      return NextResponse.json({ success: false, error: accountInfo.msg1 }, { status: 400 });
    }

    const usdBalance = parseFloat(accountInfo.output2.frcr_evlu_amt2 || '0');
    const rawHoldings = accountInfo.output1 || [];

    const holdings = rawHoldings.map((h: any) => {
      const avgPrice = parseFloat(h.pchs_avg_pric || '0');
      const currentPrice = parseFloat(h.prpr || '0');
      return {
        ticker: h.pdno,
        qty: parseInt(h.ccld_qty_smtl1 || '0'),
        avgPrice,
        currentPrice,
        roi: avgPrice > 0 ? ((currentPrice - avgPrice) / avgPrice) * 100 : 0
      };
    }).filter((h: any) => h.qty > 0);

    return NextResponse.json({
      success: true,
      data: {
        balance: usdBalance,
        holdings
      }
    });

  } catch (err: any) {
    console.error('Auto-trade API Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
