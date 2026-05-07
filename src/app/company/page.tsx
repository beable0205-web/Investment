'use client';

import { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
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

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker.trim()) return;

    setLoading(true);
    setError(null);
    setReport(null);
    setActiveReportTab('fundamental');

    try {
      const res = await fetch(`/api/company?ticker=${encodeURIComponent(ticker.trim())}`);
      const json = await res.json();

      if (json.success) {
        setReport(json.data);
      } else {
        setError(json.error || '분석 중 오류가 발생했습니다.');
      }
    } catch (err: any) {
      setError('서버와 통신할 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = async () => {
    if (!reportRef.current || isExporting || !report) return;
    setIsExporting(true);

    try {
      const sections = reportRef.current.querySelectorAll('.pdf-section');
      const pdf = new jsPDF('portrait', 'mm', 'a4');
      
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i] as HTMLElement;
        const canvas = await html2canvas(section, { 
          scale: 2, 
          useCORS: true,
          backgroundColor: '#0a0a0c' // 홈페이지 배경색과 동일하게 지정 (투명도 문제 해결)
        });
        const imgData = canvas.toDataURL('image/png');
        
        // A4 Portrait 크기 (210 x 297 mm)
        const pdfWidth = 210;
        const pdfHeight = 297;
        
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      }

      const activeData = activeReportTab === 'fundamental' ? report.fundamental : report.technical;
      const reportType = activeReportTab === 'fundamental' ? 'Fundamental' : 'Technical';
      pdf.save(`${activeData.ticker}_${reportType}_Report.pdf`);
    } catch (err) {
      console.error('PDF Export Error:', err);
      alert('PDF 생성 중 오류가 발생했습니다.');
    } finally {
      setIsExporting(false);
    }
  };

  const activeData = report ? (activeReportTab === 'fundamental' ? report.fundamental : report.technical) : null;

  return (
    <div className="container" style={{ paddingBottom: '4rem' }}>
      <header className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="title">기업 딥다이브 (Dual Research)</h1>
          <p className="subtitle">기본적 가치와 기술적 타점을 입체적으로 분석하는 듀얼 리포트 시스템입니다.</p>
        </div>
      </header>

      <div style={{ maxWidth: '800px', margin: '0 auto 3rem auto' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '1rem' }}>
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
            type="submit" 
            disabled={loading || !ticker.trim()}
            style={{
              padding: '1rem 2rem',
              fontSize: '1.2rem',
              fontWeight: 'bold',
              borderRadius: '12px',
              border: 'none',
              background: loading ? 'var(--surface-border)' : 'var(--accent-color)',
              color: '#fff',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {loading ? '분석 중...' : '심층 리포트 생성 시작'}
          </button>
        </form>
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
          <h3>AI 멘토가 기본적/기술적 듀얼 리포트를 병렬로 생성하고 있습니다...</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>양방향 심층 분석을 위해 최대 40~60초 정도 소요될 수 있습니다.</p>
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          `}} />
        </div>
      )}

      {report && activeData && (
        <div style={{ marginTop: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '3rem' }}>
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
              className="btn"
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
                  // A4 Portrait 비율에 맞춤 (793px x 1122px)
                  width: '793px', 
                  height: '1122px',
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
                    <ReactMarkdown>{section.content}</ReactMarkdown>
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
