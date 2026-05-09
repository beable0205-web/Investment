'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, TrendingUp, RefreshCw, BarChart2 } from 'lucide-react';

export default function SimulationDashboard() {
  const [portfolio, setPortfolio] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/simulation')
      .then(res => res.json())
      .then(data => {
        setPortfolio(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <RefreshCw className="animate-spin" size={48} color="var(--accent-color)" style={{ marginBottom: '1rem' }} />
        <h2 className="title-gradient animate-fade-in">모의투자 엔진 로딩 중...</h2>
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div className="container">
        <div className="glass-panel" style={{ borderColor: 'var(--danger-color)' }}>
          <h2 style={{ color: 'var(--danger-color)' }}>오류가 발생했습니다</h2>
          <p>포트폴리오 데이터를 불러올 수 없습니다.</p>
        </div>
      </div>
    );
  }

  const initialCash = 100000;
  const totalReturn = ((portfolio.totalEquity - initialCash) / initialCash) * 100;

  return (
    <div className="container animate-fade-in">
      <header style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 className="title-gradient" style={{ fontSize: '2.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Activity size={36} color="var(--accent-color)" />
            단테 실전 모의투자 엔진
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem' }}>
            단테 기법 기반 알고리즘 자동 매매 (Paper Trading)
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link href="/" className="btn">
            홈으로 돌아가기
          </Link>
        </div>
      </header>

      {/* Top Stats */}
      <div className="glass-panel" style={{ marginBottom: '2rem' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <BarChart2 size={24} color="var(--accent-color)" /> 가상 계좌 현황
        </h3>
        <div className="grid-3">
          <div className="metric-card">
            <span className="metric-label">총 자산 (Total Equity)</span>
            <span className="metric-value">${portfolio.totalEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">가용 예수금 (Cash)</span>
            <span className="metric-value">${portfolio.cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">누적 수익률 (Total Return)</span>
            <span className={`metric-value ${totalReturn >= 0 ? 'metric-positive' : 'metric-negative'}`}>
              {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid-2">
        {/* Open Positions */}
        <div className="glass-panel">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <TrendingUp size={24} color="var(--success-color)" /> 현재 보유 종목 ({portfolio.positions?.length || 0}/5)
          </h3>
          
          {portfolio.positions?.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>현재 보유 중인 종목이 없습니다. 밥그릇 3번 자리 타점 대기 중...</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {portfolio.positions.map((pos: any, idx: number) => (
                <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#fff' }}>{pos.ticker}</span>
                      <span style={{ fontSize: '0.8rem', background: 'rgba(79, 70, 229, 0.2)', color: '#c7d2fe', padding: '0.1rem 0.5rem', borderRadius: '12px' }}>
                        {pos.companyName}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{pos.rule}</p>
                    <p style={{ fontSize: '0.85rem', color: '#e2e8f0', marginTop: '0.5rem' }}>
                      진입가: ${pos.entryPrice.toFixed(2)} | 수량: {pos.quantity}주
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>현재가</p>
                    <p style={{ fontFamily: 'monospace', fontSize: '1.1rem', color: '#fff' }}>${(pos.currentPrice || pos.entryPrice).toFixed(2)}</p>
                    <p style={{ fontSize: '1rem', fontWeight: 'bold', color: pos.roi >= 0 ? 'var(--success-color)' : 'var(--danger-color)', marginTop: '0.25rem' }}>
                      {pos.roi > 0 ? '+' : ''}{pos.roi.toFixed(2)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Trade History */}
        <div className="glass-panel">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            📜 최근 매매 내역
          </h3>
          
          {portfolio.history?.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>아직 매매 내역이 없습니다.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '500px', overflowY: 'auto', paddingRight: '0.5rem' }}>
              {[...portfolio.history].reverse().map((trade: any, idx: number) => (
                <div key={idx} style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--surface-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div>
                      <span style={{ fontWeight: 'bold', fontSize: '1rem', color: '#fff' }}>{trade.ticker}</span>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{trade.reason}</p>
                    </div>
                    <div style={{ textAlign: 'right', color: trade.profit >= 0 ? 'var(--success-color)' : 'var(--danger-color)' }}>
                      <p style={{ fontWeight: 'bold' }}>{trade.profit >= 0 ? '+' : ''}${trade.profit.toFixed(2)}</p>
                      <p style={{ fontSize: '0.85rem' }}>{trade.roi >= 0 ? '+' : ''}{trade.roi.toFixed(2)}%</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--surface-border)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                    <span>진입: {trade.entryDate} (${trade.entryPrice.toFixed(2)})</span>
                    <span>청산: {trade.exitDate} (${trade.exitPrice.toFixed(2)})</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
