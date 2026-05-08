'use client';

import { useState, useEffect } from 'react';
import { LineChart, TrendingUp, TrendingDown, Trash2, Crosshair, Calendar } from 'lucide-react';

export default function TrackingPage() {
  const [stocks, setStocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTrackingList();
  }, []);

  const fetchTrackingList = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tracking/list');
      const json = await res.json();
      if (json.success) {
        setStocks(json.data);
      } else {
        setError(json.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const removeStock = async (id: string) => {
    if (!confirm('포트폴리오에서 삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/tracking/delete?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        fetchTrackingList();
      }
    } catch (err) {
      alert('삭제 실패');
    }
  };

  // 통계 계산
  const totalStocks = stocks.length;
  const profitableStocks = stocks.filter(s => s.roi > 0).length;
  const avgRoi = totalStocks > 0 ? stocks.reduce((acc, s) => acc + s.roi, 0) / totalStocks : 0;

  return (
    <div className="container animate-fade-in" style={{ paddingBottom: '4rem' }}>
      <header className="header" style={{ marginBottom: '2rem' }}>
        <h1 className="title-gradient" style={{ fontSize: '2.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <LineChart size={36} color="#ef4444" />
          수익률 트래킹 포트폴리오
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem' }}>
          AI 스크리너가 발굴한 종목들의 실시간 성과를 검증하고 추적합니다.
        </p>
      </header>

      {/* 요약 대시보드 */}
      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ flex: 1, padding: '1.5rem', borderLeft: '4px solid #ef4444' }}>
          <h3 style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>평균 수익률</h3>
          <p style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: '0.5rem 0 0 0', color: avgRoi >= 0 ? '#ef4444' : '#3b82f6' }}>
            {avgRoi > 0 ? '+' : ''}{avgRoi.toFixed(2)}%
          </p>
        </div>
        <div className="glass-panel" style={{ flex: 1, padding: '1.5rem', borderLeft: '4px solid var(--accent-color)' }}>
          <h3 style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>승률 (수익 중인 종목)</h3>
          <p style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: '0.5rem 0 0 0', color: '#fff' }}>
            {totalStocks > 0 ? Math.round((profitableStocks / totalStocks) * 100) : 0}% 
            <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>({profitableStocks}/{totalStocks})</span>
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '5rem' }}>
          <div className="spinner" style={{ margin: '0 auto' }}></div>
        </div>
      ) : error ? (
        <div style={{ color: '#ef4444', textAlign: 'center', padding: '2rem' }}>오류: {error}</div>
      ) : stocks.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-secondary)' }}>
          스크리너에서 발굴된 종목을 트래킹 포트폴리오에 추가해 보세요.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {stocks.map((stock) => {
            const isProfit = stock.roi > 0;
            const isLoss = stock.roi < 0;
            const color = isProfit ? '#ef4444' : isLoss ? '#3b82f6' : '#fff';
            
            return (
              <div key={stock.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ flex: 2 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.5rem', color: '#fff' }}>{stock.name}</h3>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{stock.ticker}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Calendar size={14} /> 발굴일: {new Date(stock.discoveryDate).toLocaleDateString()}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Crosshair size={14} /> 기준가: ${stock.discoveryPrice.toLocaleString()}
                    </span>
                  </div>
                  {stock.matchReasons && stock.matchReasons.length > 0 && (
                    <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '0.5rem 0.75rem', borderRadius: '8px', display: 'inline-block' }}>
                      {stock.matchReasons[0]}
                    </div>
                  )}
                </div>

                <div style={{ flex: 1, textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>현재가</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fff' }}>
                    ${stock.currentPrice?.toLocaleString()}
                  </div>
                </div>

                <div style={{ flex: 1, textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', paddingRight: '2rem' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>수익률</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: color, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    {isProfit ? <TrendingUp size={24} /> : isLoss ? <TrendingDown size={24} /> : null}
                    {stock.roi > 0 ? '+' : ''}{stock.roi}%
                  </div>
                </div>

                <button 
                  onClick={() => removeStock(stock.id)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.5rem' }}
                  title="삭제"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
