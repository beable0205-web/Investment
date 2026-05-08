'use client';

import { useState, useEffect } from 'react';
import { Bot, RefreshCw, Power, PowerOff, ShieldCheck, AlertCircle } from 'lucide-react';

export default function AutoTradePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [botActive, setBotActive] = useState(true);

  const fetchAccountInfo = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auto-trade');
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        setError(json.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccountInfo();
  }, []);

  const totalInvestment = data?.data?.holdings.reduce((acc: number, h: any) => acc + (h.avgPrice * h.qty), 0) || 0;
  const currentValuation = data?.data?.holdings.reduce((acc: number, h: any) => acc + (h.currentPrice * h.qty), 0) || 0;
  const totalRoi = totalInvestment > 0 ? ((currentValuation - totalInvestment) / totalInvestment) * 100 : 0;

  return (
    <div className="container animate-fade-in" style={{ paddingBottom: '4rem' }}>
      <header className="header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="title-gradient" style={{ fontSize: '2.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Bot size={36} color="#8b5cf6" />
            실전 퀀트 자동 매매 봇
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem', marginTop: '0.5rem' }}>
            한국투자증권 API와 연동되어 알고리즘 매수 및 동적 추세 추종 매도(20일선 이탈 또는 대량음봉 출현 시 익절)를 100% 무인 자동 수행합니다.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            onClick={fetchAccountInfo}
            className="btn" 
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.1)' }}
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} /> 새로고침
          </button>
          <button 
            onClick={() => setBotActive(!botActive)}
            className="btn" 
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.5rem', 
              background: botActive ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
              color: botActive ? '#ef4444' : '#10b981',
              border: `1px solid ${botActive ? '#ef4444' : '#10b981'}`
            }}
          >
            {botActive ? <PowerOff size={18} /> : <Power size={18} />}
            {botActive ? 'Kill-Switch (봇 정지)' : '봇 가동하기'}
          </button>
        </div>
      </header>

      {error ? (
        <div style={{ padding: '2rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={24} /> API 연결 오류: {error}
        </div>
      ) : loading && !data ? (
        <div style={{ textAlign: 'center', padding: '5rem' }}>
          <div className="spinner" style={{ margin: '0 auto' }}></div>
        </div>
      ) : data ? (
        <>
          {data.mock && (
            <div style={{ padding: '1rem', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', borderRadius: '12px', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={20} /> 현재 .env.local에 증권사 API 키가 없어 가상의 데모 데이터(Mock)를 보여주고 있습니다.
            </div>
          )}

          <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem' }}>
            <div className="glass-panel" style={{ flex: 1, padding: '1.5rem', borderTop: '4px solid #10b981' }}>
              <h3 style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>달러 예수금 (매수 가능 금액)</h3>
              <p style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: '0.5rem 0 0 0', color: '#fff' }}>
                ${data.data.balance.toLocaleString()}
              </p>
            </div>
            <div className="glass-panel" style={{ flex: 1, padding: '1.5rem', borderTop: '4px solid #8b5cf6' }}>
              <h3 style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>총 매입 금액</h3>
              <p style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: '0.5rem 0 0 0', color: '#fff' }}>
                ${totalInvestment.toLocaleString()}
              </p>
            </div>
            <div className="glass-panel" style={{ flex: 1, padding: '1.5rem', borderTop: `4px solid ${totalRoi >= 0 ? '#10b981' : '#ef4444'}` }}>
              <h3 style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>현재 총 수익률</h3>
              <p style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: '0.5rem 0 0 0', color: totalRoi >= 0 ? '#10b981' : '#ef4444' }}>
                {totalRoi > 0 ? '+' : ''}{totalRoi.toFixed(2)}%
              </p>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ margin: '0 0 1.5rem 0', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={20} color="#10b981" /> 봇이 관리 중인 보유 종목 (Auto-Managed Holdings)
            </h3>
            
            {data.data.holdings.length === 0 ? (
              <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '3rem' }}>
                현재 보유 중인 종목이 없습니다.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '1rem' }}>종목명(티커)</th>
                    <th style={{ padding: '1rem', textAlign: 'right' }}>보유 수량</th>
                    <th style={{ padding: '1rem', textAlign: 'right' }}>매입 단가</th>
                    <th style={{ padding: '1rem', textAlign: 'right' }}>현재가</th>
                    <th style={{ padding: '1rem', textAlign: 'right' }}>현재 수익률 (추세 추종 중)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.holdings.map((h: any, idx: number) => {
                    const isProfit = h.roi > 0;
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '1rem', color: '#fff', fontWeight: 'bold' }}>{h.ticker}</td>
                        <td style={{ padding: '1rem', color: 'var(--text-secondary)', textAlign: 'right' }}>{h.qty}주</td>
                        <td style={{ padding: '1rem', color: '#fff', textAlign: 'right' }}>${h.avgPrice.toFixed(2)}</td>
                        <td style={{ padding: '1rem', color: '#fff', textAlign: 'right' }}>${h.currentPrice.toFixed(2)}</td>
                        <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold', color: isProfit ? '#10b981' : '#ef4444' }}>
                          {isProfit ? '+' : ''}{h.roi.toFixed(2)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
