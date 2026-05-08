'use client';

import { useState } from 'react';
import { Target, TrendingUp, AlertTriangle, ShieldCheck, PlayCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function ScreenerPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const runScreener = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/screener');
      const data = await res.json();
      if (data.success) {
        setResult(data);
      } else {
        setError(data.error || '스크리닝 중 오류가 발생했습니다.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container animate-fade-in" style={{ paddingBottom: '4rem' }}>
      <header className="header" style={{ marginBottom: '2rem' }}>
        <h1 className="title-gradient" style={{ fontSize: '2.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Target size={36} color="var(--accent-color)" />
          미국 주식 전 종목 스크리너 (NASDAQ/NYSE)
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem' }}>
          224일선 눌림목, 엔벨롭 낙폭과대, 역주행 캔들 등 미국 주식 시장에서 확률 높은 타점의 종목을 자동 탐색하고 AI가 검증합니다.
        </p>
      </header>

      <div className="glass-panel" style={{ marginBottom: '2rem', padding: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ color: '#fff', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={24} color="#10b981" />
            전 종목(2,500+) 스캐닝 결과 + 제미나이 정성 검증
          </h2>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            현재 대상: 매일 장 마감 후 전 종목 대상 백그라운드 스캔 결과 실시간 분석 (터미널에서 <code>npm run scan</code> 사전 실행 필요)
          </p>
        </div>
        <button 
          className="btn" 
          onClick={runScreener} 
          disabled={loading}
          style={{ background: 'var(--accent-color)', borderColor: 'var(--accent-color)', fontSize: '1.25rem', padding: '1rem 2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          {loading ? <div className="spinner" style={{ width: '24px', height: '24px', borderWidth: '3px' }}></div> : <PlayCircle size={24} />}
          {loading ? 'AI 분석 중...' : '오늘의 추천 리포트 보기'}
        </button>
      </div>

      {error && (
        <div className="glass-panel" style={{ borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '1.5rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <AlertTriangle size={24} />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="animate-slide-up">
          <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem' }}>
            {/* 요약 박스 */}
            <div className="glass-panel" style={{ flex: 1, borderTop: '4px solid var(--accent-color)' }}>
              <h3 style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginTop: 0 }}>알고리즘 1차 포착 종목 수</h3>
              <p style={{ fontSize: '3rem', fontWeight: 'bold', margin: '0.5rem 0', color: '#fff' }}>
                {result.count || 0} <span style={{ fontSize: '1.5rem', color: 'var(--text-secondary)' }}>종목</span>
              </p>
              {result.count > 0 && result.matches && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem' }}>
                  {result.matches.map((name: string, i: number) => (
                    <span key={i} style={{ padding: '0.25rem 0.75rem', background: 'rgba(255,255,255,0.1)', borderRadius: '20px', fontSize: '0.875rem', color: '#fff' }}>
                      {name}
                    </span>
                  ))}
                </div>
              )}
            </div>
            
            {/* 상태 박스 */}
            {result.count > 0 && (
              <div className="glass-panel" style={{ flex: 1, borderTop: '4px solid #10b981', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <TrendingUp size={48} color="#10b981" />
                  <div>
                    <h3 style={{ color: '#10b981', margin: 0, fontSize: '1.5rem' }}>AI 최종 분석 완료</h3>
                    <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0 0 0' }}>매수 타점 및 손익비(손절가) 검증됨</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* AI 리포트 결과 */}
          {result.report ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div className="glass-panel" style={{ padding: '2rem', backgroundColor: '#0a0a0c' }}>
                <h2 style={{ color: 'var(--accent-color)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem', marginBottom: '2rem' }}>
                  🤖 AI 기관 트레이더 종합 분석 리포트
                </h2>
                <div className="markdown-content">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.report}</ReactMarkdown>
                </div>
              </div>

              {/* 포착 종목 리스트 및 트래킹 추가 버튼 */}
              {result.rawMatches && result.rawMatches.length > 0 && (
                <div className="glass-panel" style={{ padding: '2rem' }}>
                  <h2 style={{ marginBottom: '1.5rem', color: '#fff' }}>🎯 포착 종목 포트폴리오 편입 (트래킹)</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                    {result.rawMatches.map((match: any, idx: number) => (
                      <div key={idx} style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <h3 style={{ margin: '0 0 0.5rem 0', color: '#10b981', fontSize: '1.25rem' }}>{match.companyName}</h3>
                        <p style={{ margin: '0 0 1rem 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>현재가: ${match.close.toLocaleString()}</p>
                        <button 
                          className="btn"
                          style={{ width: '100%', padding: '0.75rem', fontSize: '0.9rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', border: '1px solid #10b981' }}
                          onClick={async (e) => {
                            const btn = e.currentTarget;
                            btn.disabled = true;
                            btn.innerText = '저장 중...';
                            try {
                              const res = await fetch('/api/tracking/add', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  ticker: match.ticker,
                                  name: match.companyName,
                                  discoveryPrice: match.close,
                                  matchReasons: match.matchReasons
                                })
                              });
                              const data = await res.json();
                              if (data.success) {
                                btn.innerText = '✓ 트래킹 등록됨';
                                btn.style.background = '#10b981';
                                btn.style.color = '#fff';
                              } else {
                                btn.innerText = '등록 실패';
                                btn.disabled = false;
                              }
                            } catch (err) {
                              btn.innerText = '오류 발생';
                              btn.disabled = false;
                            }
                          }}
                        >
                          <Target size={16} /> 트래킹 포트폴리오에 추가
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              조건에 완벽히 부합하는 종목이 오늘 시장에는 없습니다. (승률이 높지 않은 자리에서는 매매를 쉬는 것이 최고의 전략입니다)
            </div>
          )}
        </div>
      )}
    </div>
  );
}
