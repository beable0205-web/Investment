'use client';

import React, { useState } from 'react';
import { manualBuy, manualSell } from './actions';
import { Play, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

export function BuyForm() {
  const [ticker, setTicker] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleBuy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker) return;

    setLoading(true);
    setMessage('매수 진행 중...');
    
    try {
      const res = await manualBuy(ticker);
      setMessage(res.message);
      if (res.success) {
        setTicker('');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (err: any) {
      setMessage('오류가 발생했습니다.');
    }
    setLoading(false);
  };

  return (
    <div className="glass-panel" style={{ marginBottom: '2rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', borderLeft: '4px solid var(--success-color)' }}>
      <div>
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success-color)' }}>
          <TrendingUp size={20} />
          수동 매수 (Manual Buy)
        </h3>
        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          종목 코드(6자리)를 입력하시면 즉시 1억 원 한도 내에서 시장가 매수(편입)를 진행합니다.
        </p>
      </div>
      
      <form onSubmit={handleBuy} style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <input 
          type="text" 
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
          placeholder="예: 005930"
          style={{
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            border: '1px solid #334155',
            background: 'rgba(15, 23, 42, 0.6)',
            color: '#fff',
            fontSize: '1rem',
            width: '200px'
          }}
          disabled={loading}
        />
        <button 
          type="submit" 
          className="btn"
          disabled={loading || !ticker}
          style={{ 
            padding: '0.75rem 1.5rem', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem',
            backgroundColor: 'var(--success-color)'
          }}
        >
          <DollarSign size={18} />
          {loading ? '매수 중...' : '즉시 매수'}
        </button>
        {message && (
          <span style={{ fontSize: '0.9rem', color: message.includes('완료') ? 'var(--success-color)' : 'var(--danger-color)' }}>
            {message}
          </span>
        )}
      </form>
    </div>
  );
}

export function SellButton({ ticker, currentPrice }: { ticker: string, currentPrice: number }) {
  const [loading, setLoading] = useState(false);

  const handleSell = async () => {
    if (!confirm('정말 이 종목을 현재가로 전량 매도하시겠습니까?')) return;

    setLoading(true);
    try {
      const res = await manualSell(ticker);
      alert(res.message);
    } catch (err) {
      alert('매도 처리 중 오류가 발생했습니다.');
    }
    setLoading(false);
  };

  return (
    <button 
      onClick={handleSell}
      disabled={loading}
      style={{ 
        padding: '0.4rem 0.8rem', 
        fontSize: '0.85rem', 
        backgroundColor: 'transparent',
        border: '1px solid var(--danger-color)',
        color: 'var(--danger-color)',
        borderRadius: '6px',
        cursor: loading ? 'not-allowed' : 'pointer',
        marginLeft: '0.5rem',
        opacity: loading ? 0.7 : 1,
        transition: 'all 0.2s'
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--danger-color)';
        e.currentTarget.style.color = '#fff';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
        e.currentTarget.style.color = 'var(--danger-color)';
      }}
    >
      {loading ? '처리중' : '수동 매도'}
    </button>
  );
}
