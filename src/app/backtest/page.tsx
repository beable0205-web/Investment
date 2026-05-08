'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Target, TrendingUp, AlertTriangle } from 'lucide-react';

export default function BacktestPage() {
  const [ticker, setTicker] = useState('AAPL');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>(['AAPL', 'TSLA', 'NVDA', 'MSFT', 'AMD']);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  useEffect(() => {
    // 트래킹 중인 종목들을 추천 목록으로 불러오기
    fetch('/api/tracking/list')
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data.length > 0) {
          const tracked = json.data.map((s: any) => s.ticker);
          // 기본 추천 종목과 합친 뒤 중복 제거하고 최대 10개 표시
          const combined = Array.from(new Set([...tracked, 'TSLA', 'NVDA', 'AAPL', 'AMD', 'PLTR'])).slice(0, 10);
          setSuggestions(combined);
        }
      })
      .catch(() => {});

    // 글로벌 백테스트 랭킹 불러오기
    setLeaderboardLoading(true);
    fetch('/api/backtest/top')
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data.results) {
          setLeaderboard(json.data.results.slice(0, 20)); // Top 20만 표시
        }
      })
      .catch(() => {})
      .finally(() => setLeaderboardLoading(false));
  }, []);

  const runBacktest = async (targetTicker: string) => {
    if (!targetTicker) return;
    setTicker(targetTicker);
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch(`/api/backtest?ticker=${targetTicker.toUpperCase()}`);
      const json = await res.json();
      if (json.success) {
        setResult(json.data);
      } else {
        setError(json.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBacktest = async (e: React.FormEvent) => {
    e.preventDefault();
    runBacktest(ticker);
  };

  return (
    <div className="container animate-fade-in" style={{ paddingBottom: '4rem' }}>
      <header className="header" style={{ marginBottom: '2rem' }}>
        <h1 className="title-gradient" style={{ fontSize: '2.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Activity size={36} color="#3b82f6" />
          알고리즘 5년치 퀀트 백테스팅
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem' }}>
          과거 5년간의 데이터를 기반으로 현재 타점(밥그릇 3번 자리, 엔벨롭 하단)의 승률과 수익률을 검증합니다.
        </p>
      </header>

      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <form onSubmit={handleBacktest} style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
          <input 
            type="text" 
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            placeholder="티커 입력 (예: AAPL, TSLA)"
            className="search-input"
            style={{ flex: 1, padding: '1rem', fontSize: '1.25rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.5)', color: '#fff' }}
          />
          <button 
            type="submit" 
            className="btn"
            disabled={loading}
            style={{ padding: '1rem 2rem', fontSize: '1.25rem', height: '100%', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' }}
          >
            {loading ? '검증 중...' : '백테스트 실행'}
          </button>
        </form>
        
        {/* 추천 종목 태그 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>💡 추천 종목 (최근 포착):</span>
          {suggestions.map((sug) => (
            <button
              key={sug}
              type="button"
              onClick={() => runBacktest(sug)}
              disabled={loading}
              style={{
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                color: '#60a5fa',
                padding: '0.25rem 0.75rem',
                borderRadius: '999px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'}
            >
              {sug}
            </button>
          ))}
        </div>

        {error && <div style={{ color: '#ef4444', marginTop: '1rem' }}>{error}</div>}
      </div>

      {!result && (
        <div className="glass-panel animate-fade-in" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <h3 style={{ margin: '0 0 1.5rem 0', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🏆 알고리즘 승률 랭킹 (Global Top 20)
          </h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            미국 증시 전 종목을 대상으로 5년 치 백테스트를 일괄 수행한 결과입니다. 가장 승률이 높은 종목을 클릭해 상세 백테스트를 확인하세요.
          </p>

          {leaderboardLoading ? (
            <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>
              글로벌 랭킹 데이터를 불러오는 중입니다...
            </div>
          ) : leaderboard.length === 0 ? (
            <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>
              아직 전체 종목 시뮬레이션 결과가 없습니다.<br />
              백그라운드에서 백테스트가 진행 중일 수 있습니다.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '1rem' }}>순위</th>
                    <th style={{ padding: '1rem' }}>종목명 (티커)</th>
                    <th style={{ padding: '1rem', textAlign: 'center' }}>총 거래 횟수</th>
                    <th style={{ padding: '1rem', textAlign: 'center' }}>승률</th>
                    <th style={{ padding: '1rem', textAlign: 'right' }}>총수익률</th>
                    <th style={{ padding: '1rem', textAlign: 'center' }}>상세 보기</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((item: any, idx: number) => (
                    <tr key={item.ticker} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '1rem', color: '#fff', fontWeight: 'bold' }}>{idx + 1}위</td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ color: '#fff', fontWeight: 'bold' }}>{item.ticker}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{item.name}</div>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>{item.totalTrades}회</td>
                      <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 'bold', color: '#3b82f6' }}>{item.winRate.toFixed(1)}%</td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold', color: item.totalReturn >= 0 ? '#10b981' : '#ef4444' }}>
                        {item.totalReturn > 0 ? '+' : ''}{item.totalReturn.toFixed(2)}%
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <button
                          onClick={() => runBacktest(item.ticker)}
                          style={{
                            background: 'rgba(59, 130, 246, 0.1)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            color: '#60a5fa',
                            padding: '0.5rem 1rem',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.9rem'
                          }}
                        >
                          테스트
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {result && (
        <>
          {/* 주요 통계 요약 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
            <div className="glass-panel" style={{ padding: '1.5rem', borderTop: '4px solid #10b981' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>총수익률 (Total Return)</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: result.totalReturn >= 0 ? '#10b981' : '#ef4444' }}>
                {result.totalReturn > 0 ? '+' : ''}{result.totalReturn.toFixed(2)}%
              </div>
            </div>
            <div className="glass-panel" style={{ padding: '1.5rem', borderTop: '4px solid #3b82f6' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>승률 (Win Rate)</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#fff' }}>
                {result.winRate.toFixed(1)}%
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {result.winningTrades}승 {result.losingTrades}패
              </div>
            </div>
            <div className="glass-panel" style={{ padding: '1.5rem', borderTop: '4px solid #8b5cf6' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>총 거래 횟수</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#fff' }}>
                {result.totalTrades}회
              </div>
            </div>
            <div className="glass-panel" style={{ padding: '1.5rem', borderTop: '4px solid #ef4444' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>최대 낙폭 (MDD)</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ef4444' }}>
                -{result.mdd.toFixed(2)}%
              </div>
            </div>
          </div>

          {/* 자산 성장 곡선 (Equity Curve) */}
          <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem', height: '400px' }}>
            <h3 style={{ margin: '0 0 1.5rem 0', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={20} color="#3b82f6" /> 5년 자산 성장 곡선 (시작 금액: $10,000)
            </h3>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={result.equityCurve} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <Line type="monotone" dataKey="equity" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <CartesianGrid stroke="#333" strokeDasharray="5 5" />
                <XAxis dataKey="date" stroke="#666" tickFormatter={(tick) => tick.substring(0, 4)} />
                <YAxis stroke="#666" domain={['auto', 'auto']} tickFormatter={(tick) => '$' + tick.toLocaleString()} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                  formatter={(value: any) => ['$' + value.toLocaleString(), '자산']}
                  labelFormatter={(label) => '날짜: ' + label}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* 트레이딩 히스토리 */}
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ margin: '0 0 1.5rem 0', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Target size={20} color="#10b981" /> 매매 히스토리 (과거 5년)
            </h3>
            {result.trades.length === 0 ? (
              <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>
                매매 기록이 없습니다. (타점 발생 안함)
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '1rem' }}>진입일</th>
                      <th style={{ padding: '1rem' }}>규칙 (타점)</th>
                      <th style={{ padding: '1rem' }}>진입가</th>
                      <th style={{ padding: '1rem' }}>청산일</th>
                      <th style={{ padding: '1rem' }}>청산가</th>
                      <th style={{ padding: '1rem' }}>청산 사유</th>
                      <th style={{ padding: '1rem', textAlign: 'right' }}>수익률</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.trades.map((trade: any, idx: number) => {
                      const isProfit = trade.roi > 0;
                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '1rem', color: '#fff' }}>{new Date(trade.entryDate).toLocaleDateString()}</td>
                          <td style={{ padding: '1rem', color: '#10b981', fontSize: '0.9rem' }}>{trade.rule}</td>
                          <td style={{ padding: '1rem', color: '#fff' }}>${trade.entryPrice.toFixed(2)}</td>
                          <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{new Date(trade.exitDate).toLocaleDateString()}</td>
                          <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>${trade.exitPrice.toFixed(2)}</td>
                          <td style={{ padding: '1rem', fontSize: '0.9rem', color: isProfit ? '#10b981' : (trade.exitReason?.includes('손절') ? '#ef4444' : 'var(--text-secondary)') }}>
                            {trade.exitReason || '종료'}
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold', color: isProfit ? '#10b981' : '#ef4444' }}>
                            {isProfit ? '+' : ''}{trade.roi.toFixed(2)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
