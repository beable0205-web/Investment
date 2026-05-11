import fs from 'fs';
import path from 'path';
import { BuyForm, SellButton } from './TradeComponents';

export const dynamic = 'force-dynamic';

export default function KrPortfolioPage() {
  const dbPath = path.join(process.cwd(), 'src', 'data', 'kr_tracked_stocks.json');
  let db: any = { stocks: [] };
  
  if (fs.existsSync(dbPath)) {
    db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  }

  const stocks = db.stocks || [];
  
  const trackingStocks = stocks.filter((s: any) => s.status === 'TRACKING');
  const soldStocks = stocks.filter((s: any) => s.status === 'SOLD');

  const winningTrades = soldStocks.filter((s: any) => s.realizedROI > 0);
  const winRate = soldStocks.length > 0 ? ((winningTrades.length / soldStocks.length) * 100).toFixed(1) : 0;

  const totalRealizedROI = soldStocks.length > 0 
    ? (soldStocks.reduce((sum: number, s: any) => sum + s.realizedROI, 0) / soldStocks.length).toFixed(2)
    : 0;

  const totalUnrealizedROI = trackingStocks.length > 0
    ? (trackingStocks.reduce((sum: number, s: any) => sum + (s.unrealizedROI || 0), 0) / trackingStocks.length).toFixed(2)
    : 0;

  return (
    <div className="container animate-fade-in" style={{ paddingBottom: '4rem' }}>
      <header style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 className="title-gradient" style={{ fontSize: '2.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            💼 AI Intelligence Terminal
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem' }}>
            단테 기법 기반 6개월 스윙 (목표 +50%) 시뮬레이션 펀드
          </p>
        </div>
        <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>System Status</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success-color)', fontWeight: 'bold' }}>
            <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--success-color)', boxShadow: '0 0 10px var(--success-color)' }}></span>
            LIVE TRACKING
          </div>
        </div>
      </header>

      {/* Overview Stats */}
      <div className="grid-2" style={{ marginBottom: '3rem' }}>
        <div className="glass-panel">
          <span className="metric-label">계좌 총 자산 (Total Value)</span>
          <span className="metric-value">
            {db.account ? (db.account.cash + trackingStocks.reduce((sum: number, s: any) => sum + (s.shares * s.currentPrice || 0), 0)).toLocaleString() : '-'} ₩
          </span>
        </div>
        <div className="glass-panel">
          <span className="metric-label">보유 현금 (Cash)</span>
          <span className="metric-value">
            {db.account ? db.account.cash.toLocaleString() : '-'} ₩
          </span>
        </div>
        <div className="glass-panel">
          <span className="metric-label">현재 평가 수익금 (Unrealized)</span>
          <span className={`metric-value ${Number(totalUnrealizedROI) >= 0 ? 'metric-positive' : 'metric-negative'}`}>
            {trackingStocks.length > 0 ? trackingStocks.reduce((sum: number, s: any) => sum + ((s.shares * s.currentPrice) - (s.investedAmount || 0)), 0).toLocaleString() : 0} ₩
          </span>
        </div>
        <div className="glass-panel">
          <span className="metric-label">누적 확정 수익금 (Realized)</span>
          <span className={`metric-value ${db.account?.totalRealizedProfit >= 0 ? 'metric-positive' : 'metric-negative'}`}>
            {db.account ? db.account.totalRealizedProfit.toLocaleString() : 0} ₩
          </span>
        </div>
      </div>

      {/* Manual Buy Form */}
      <BuyForm />

      {/* Tracking Portfolio */}
      <div className="glass-panel" style={{ marginBottom: '3rem', borderTop: '4px solid #3b82f6' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
          📊 Tracking Portfolio
        </h2>
        {trackingStocks.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '3rem 0' }}>현재 모니터링 중인 종목이 없습니다.</p>
        ) : (
          <div className="markdown-content">
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 0 }}>
              <thead>
                <tr>
                  <th>회사명</th>
                  <th>편입일자</th>
                  <th style={{ textAlign: 'right' }}>매수 금액 (수량)</th>
                  <th style={{ textAlign: 'right' }}>현재가</th>
                  <th style={{ textAlign: 'right' }}>수익률</th>
                  <th style={{ textAlign: 'right' }}>액션</th>
                </tr>
              </thead>
              <tbody>
                {trackingStocks.map((stock: any, i: number) => (
                  <tr key={i}>
                    <td>
                      <a href={`https://finance.naver.com/item/main.naver?code=${stock.ticker.split('.')[0]}`} target="_blank" rel="noreferrer" style={{ fontWeight: 'bold', color: '#fff', textDecoration: 'none' }}>
                        {stock.companyName}
                      </a>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{new Date(stock.addedDate).toLocaleDateString()}</td>
                    <td style={{ textAlign: 'right', color: '#e2e8f0' }}>
                      {stock.investedAmount?.toLocaleString()} ₩ <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>({stock.shares?.toLocaleString()}주)</span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#fff' }}>{stock.currentPrice?.toLocaleString() || '-'} ₩</td>
                    <td style={{ textAlign: 'right' }}>
                      <span style={{ 
                        display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: '4px', fontWeight: 'bold',
                        backgroundColor: stock.unrealizedROI > 0 ? 'rgba(16, 185, 129, 0.1)' : stock.unrealizedROI < 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.1)',
                        color: stock.unrealizedROI > 0 ? 'var(--success-color)' : stock.unrealizedROI < 0 ? 'var(--danger-color)' : '#fff'
                      }}>
                        {stock.unrealizedROI ? `${stock.unrealizedROI > 0 ? '+' : ''}${stock.unrealizedROI.toFixed(2)}%` : '-'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <a href={`/kr-report/${stock.ticker}?type=BUY`} className="btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>Deep Dive</a>
                      <SellButton ticker={stock.ticker} currentPrice={stock.currentPrice || 0} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Closed Positions */}
      <div className="glass-panel" style={{ borderTop: '4px solid var(--danger-color)' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
          📜 Closed Positions
        </h2>
        {soldStocks.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '3rem 0' }}>종료된 포지션이 없습니다.</p>
        ) : (
          <div className="markdown-content">
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 0 }}>
              <thead>
                <tr>
                  <th>회사명</th>
                  <th>청산일자</th>
                  <th style={{ textAlign: 'right' }}>진입 → 청산 단가</th>
                  <th style={{ textAlign: 'right' }}>최종 수익률</th>
                  <th style={{ textAlign: 'right' }}>리포트</th>
                </tr>
              </thead>
              <tbody>
                {soldStocks.sort((a: any, b: any) => new Date(b.sellDate).getTime() - new Date(a.sellDate).getTime()).map((stock: any, i: number) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 'bold', color: '#fff' }}>{stock.companyName}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{new Date(stock.sellDate).toLocaleDateString()}</td>
                    <td style={{ textAlign: 'right', color: '#e2e8f0' }}>
                      {stock.entryPrice?.toLocaleString()} ₩ <span style={{ color: 'var(--text-secondary)', margin: '0 0.5rem' }}>→</span> {stock.sellPrice?.toLocaleString()} ₩
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span style={{ 
                        display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: '4px', fontWeight: 'bold',
                        backgroundColor: stock.realizedROI > 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: stock.realizedROI > 0 ? 'var(--success-color)' : 'var(--danger-color)'
                      }}>
                        {stock.realizedROI > 0 ? '+' : ''}{stock.realizedROI.toFixed(2)}%
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <a href={`/kr-report/${stock.ticker}?type=SELL`} className="btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', backgroundColor: 'var(--danger-color)' }}>Exit Report</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
