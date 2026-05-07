'use client';

import { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Download } from 'lucide-react';

export default function CompanyAnalysisPage() {
  const [ticker, setTicker] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<{ fundamental?: any, technical?: any } | null>(null);
  const [activeReportTab, setActiveReportTab] = useState<'fundamental' | 'technical'>('fundamental');
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  
  const reportRef = useRef<HTMLDivElement>(null);

  const generateReport = async (type: 'fundamental' | 'technical') => {
    if (!ticker.trim()) return;

    setLoading(true);
    setError(null);
    setActiveReportTab(type);

    try {
      const res = await fetch(`/api/company?ticker=${encodeURIComponent(ticker.trim())}&type=${type}`);
      const json = await res.json();

      if (json.success) {
        setReport(prev => ({ ...prev, ...json.data }));
      } else {
        setError(json.error || '분석 중 오류가 발생했습니다.');
      }
    } catch (err: any) {
      setError('서버와 통신할 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = () => {
    // 브라우저 기본 인쇄 기능 호출 (PDF 저장용)
    window.print();
  };

  const activeData = report ? (activeReportTab === 'fundamental' ? report.fundamental : report.technical) : null;

  return (
    <div className="container" style={{ paddingBottom: '4rem' }}>
      <header className="header no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="title">기업 딥다이브 (Dual Research)</h1>
          <p className="subtitle">기본적 가치와 기술적 타점을 입체적으로 분석하는 듀얼 리포트 시스템입니다.</p>
        </div>
      </header>

      <div className="no-print" style={{ maxWidth: '800px', margin: '0 auto 3rem auto' }}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            placeholder="기업 티커 입력 (예: AAPL, TSLA, NVDA)"
            style={{
              flex: 1,
              padding: '1rem 1.5rem',
              fontSize: '1.2rem',
              borderRadius: '12px',
              border: '2px solid var(--surface-border)',
              background: 'var(--surface-color)',
              color: '#fff',
              outline: 'none'
            }}
          />
          <button 
            onClick={() => generateReport('fundamental')}
            disabled={loading || !ticker.trim()}
            style={{
              padding: '1rem 2rem',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              borderRadius: '12px',
              border: 'none',
              background: loading ? 'var(--surface-border)' : 'var(--accent-color)',
              color: '#fff',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
          >
            📊 SMIC 기본적 분석 생성
          </button>
          <button 
            onClick={() => generateReport('technical')}
            disabled={loading || !ticker.trim()}
            style={{
              padding: '1rem 2rem',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              borderRadius: '12px',
              border: 'none',
              background: loading ? 'var(--surface-border)' : '#10b981',
              color: '#fff',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
          >
            📈 실전 기술적 분석 생성
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '2rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '12px', textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
          <h3>⚠️ 오류 발생</h3>
          <p>{error}</p>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--accent-color)' }}>
          <div className="spinner" style={{ width: '50px', height: '50px', border: '4px solid rgba(79, 70, 229, 0.3)', borderTop: '4px solid var(--accent-color)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1.5rem auto' }} />
          <h3>{activeReportTab === 'fundamental' ? 'AI 멘토가 SMIC 수준의 초정밀 기본적 분석 리포트를 생성 중입니다...' : 'AI 멘토가 실전 트레이딩 기술적 분석 리포트를 생성 중입니다...'}</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>{activeReportTab === 'fundamental' ? '30페이지 분량의 방대한 릴레이 분석을 수행하므로 최대 5~10분이 소요될 수 있습니다. 끄지 말고 대기해 주세요.' : '차트의 세밀한 움직임을 릴레이로 분석하기 위해 약 3~5분 정도 소요될 수 있습니다. 끄지 말고 대기해 주세요.'}</p>
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          `}} />
        </div>
      )}

      {report && activeData && (
        <div style={{ marginTop: '2rem' }}>
          <div className="no-print" style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '3rem' }}>
            <button 
              onClick={() => setActiveReportTab('fundamental')}
              style={{
                padding: '1rem 2rem', fontSize: '1.2rem', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s',
                background: activeReportTab === 'fundamental' ? 'rgba(79, 70, 229, 0.2)' : 'transparent',
                color: activeReportTab === 'fundamental' ? 'var(--accent-color)' : 'var(--text-secondary)',
                border: activeReportTab === 'fundamental' ? '2px solid var(--accent-color)' : '2px solid var(--surface-border)'
              }}
            >
              📊 기본적 분석 리포트 (SMIC)
            </button>
            <button 
              onClick={() => setActiveReportTab('technical')}
              style={{
                padding: '1rem 2rem', fontSize: '1.2rem', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s',
                background: activeReportTab === 'technical' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                color: activeReportTab === 'technical' ? '#10b981' : 'var(--text-secondary)',
                border: activeReportTab === 'technical' ? '2px solid #10b981' : '2px solid var(--surface-border)'
              }}
            >
              📈 기술적 분석 리포트 (실전 타점)
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', maxWidth: '793px', margin: '0 auto 2rem auto' }}>
            <div>
              <h2 style={{ fontSize: '2rem', color: '#fff' }}>
                {activeReportTab === 'fundamental' ? '기본적 분석' : '기술적 분석'}: {activeData.company_name} ({activeData.ticker})
              </h2>
              <p style={{ color: 'var(--text-secondary)' }}>총 {activeData.sections?.length || 0}페이지의 리포트가 생성되었습니다.</p>
            </div>
            <button 
              onClick={exportPDF} 
              disabled={isExporting}
              className="btn no-print"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#10b981', borderColor: '#10b981' }}
            >
              <Download size={20} />
              {isExporting ? 'PDF 생성 중...' : 'PDF 리포트 다운로드'}
            </button>
          </div>

          <div ref={reportRef} style={{ display: 'flex', flexDirection: 'column', gap: '3rem', alignItems: 'center' }}>
            {activeData.sections?.map((section: any, index: number) => (
              <div 
                key={index} 
                className="pdf-section card" 
                style={{ 
                  width: '793px', 
                  minHeight: '1122px',
                  height: 'auto',
                  background: 'var(--surface-color)', 
                  border: '1px solid var(--surface-border)',
                  padding: '4rem',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <div style={{ borderBottom: activeReportTab === 'fundamental' ? '2px solid var(--accent-color)' : '2px solid #10b981', paddingBottom: '1rem', marginBottom: '2rem' }}>
                  <h2 style={{ fontSize: '2.2rem', color: '#fff', margin: 0 }}>{section.title}</h2>
                </div>
                
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  <div className="markdown-content" style={{ fontSize: '1.2rem', lineHeight: '1.9', color: '#e2e8f0', textAlign: 'justify' }}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{section.content}</ReactMarkdown>
                  </div>
                  
                  {section.key_points && section.key_points.length > 0 && (
                    <div style={{ marginTop: 'auto', background: activeReportTab === 'fundamental' ? 'rgba(79, 70, 229, 0.1)' : 'rgba(16, 185, 129, 0.1)', padding: '2rem', borderRadius: '12px', borderLeft: activeReportTab === 'fundamental' ? '4px solid var(--accent-color)' : '4px solid #10b981' }}>
                      <h3 style={{ fontSize: '1.3rem', color: activeReportTab === 'fundamental' ? 'var(--accent-color)' : '#10b981', marginBottom: '1rem', marginTop: 0 }}>Executive Summary</h3>
                      <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '1.15rem', color: '#fff', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {section.key_points.map((point: string, pIdx: number) => (
                          <li key={pIdx} style={{ lineHeight: '1.6' }}>{point}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div style={{ position: 'absolute', bottom: '2rem', right: '3rem', color: 'var(--text-secondary)', fontSize: '1.1rem', fontWeight: 'bold' }}>
                  {index + 1} / {activeData.sections.length}
                </div>
                <div style={{ position: 'absolute', bottom: '2rem', left: '3rem', color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
                  {activeReportTab === 'fundamental' ? 'SMIC Style Research' : 'Trading & Technical Analysis'} | {activeData.ticker} Analysis
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
