import fs from 'fs';
import path from 'path';

export default async function SimulationPage() {
  const dbPath = path.join(process.cwd(), 'src', 'data', 'simulation', 'portfolio.json');
  let p = { cash: 500000, totalEquity: 500000, positions: [], history: [] };
  
  if (fs.existsSync(dbPath)) {
    p = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
  }

  const roi = ((p.totalEquity - 500000) / 500000) * 100;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#f8fafc', padding: '3rem 2rem', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '2.5rem', background: 'linear-gradient(to right, #10b981, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 800 }}>
          자율주행 투자 포트폴리오 (Automated Portfolio)
        </h1>

        {/* 요약 카드 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)', borderRadius: '16px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <h3 style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>총 자산 (Total Equity)</h3>
            <p style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>${p.totalEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)', borderRadius: '16px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <h3 style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>가용 현금 (Available Cash)</h3>
            <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#10b981' }}>${p.cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)', borderRadius: '16px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <h3 style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>총 수익률 (Total Return)</h3>
            <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: roi >= 0 ? '#ef4444' : '#3b82f6' }}>
              {roi > 0 ? '+' : ''}{roi.toFixed(2)}%
            </p>
          </div>
        </div>

        {/* 보유 종목 리스트 */}
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', color: '#f1f5f9' }}>현재 보유 종목 (Active Positions)</h2>
        <div style={{ overflowX: 'auto', background: 'rgba(0,0,0,0.2)', borderRadius: '16px', padding: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
            <thead>
              <tr style={{ color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.1)', textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '1px' }}>
                <th style={{ padding: '1.2rem 1rem' }}>종목명 (Ticker)</th>
                <th style={{ padding: '1.2rem 1rem' }}>매입일 (Entry Date)</th>
                <th style={{ padding: '1.2rem 1rem' }}>매입가 (Entry Price)</th>
                <th style={{ padding: '1.2rem 1rem' }}>현재가 (Current Price)</th>
                <th style={{ padding: '1.2rem 1rem' }}>수익률 (ROI)</th>
                <th style={{ padding: '1.2rem 1rem' }}>평가금액 (Value)</th>
              </tr>
            </thead>
            <tbody>
              {p.positions.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#64748b', fontSize: '1.1rem' }}>현재 편입된 종목이 없습니다. 현금 대기 중입니다.</td>
                </tr>
              ) : (
                p.positions.map((pos: any, i: number) => {
                  const currentVal = pos.quantity * (pos.currentPrice || pos.entryPrice);
                  const isProfit = (pos.roi || 0) >= 0;
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '1.2rem 1rem', fontWeight: 'bold', color: '#f8fafc', fontSize: '1.1rem' }}>
                        {pos.ticker}
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 'normal', marginTop: '0.2rem' }}>{pos.companyName}</div>
                      </td>
                      <td style={{ padding: '1.2rem 1rem', color: '#cbd5e1' }}>{pos.entryDate}</td>
                      <td style={{ padding: '1.2rem 1rem' }}>${pos.entryPrice.toFixed(2)}</td>
                      <td style={{ padding: '1.2rem 1rem' }}>${(pos.currentPrice || pos.entryPrice).toFixed(2)}</td>
                      <td style={{ padding: '1.2rem 1rem', color: isProfit ? '#ef4444' : '#3b82f6', fontWeight: 'bold' }}>
                        {isProfit ? '+' : ''}{(pos.roi || 0).toFixed(2)}%
                      </td>
                      <td style={{ padding: '1.2rem 1rem', fontWeight: '600' }}>${currentVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
