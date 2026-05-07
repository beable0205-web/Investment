'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Globe, RefreshCw, ExternalLink, Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useRef } from 'react';

export default function IBBriefingPage() {
  const [newsList, setNewsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchBriefing();
  }, []);

  const fetchBriefing = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ib-news');
      const json = await res.json();

      if (json.success) {
        setNewsList(json.data);
      } else {
        setError(json.error || '브리핑을 불러오는 중 오류가 발생했습니다.');
      }
    } catch (err: any) {
      setError('서버와 통신할 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = async () => {
    if (!reportRef.current || isExporting) return;
    setIsExporting(true);

    try {
      const canvas = await html2canvas(reportRef.current, { 
        scale: 2, 
        useCORS: true,
        backgroundColor: '#0a0a0c' // 바탕화면 톤을 고정하여 투명도 이슈 제거
      });
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF('portrait', 'mm', 'a4');
      const pdfWidth = 210;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Global_IB_Briefing.pdf`);
    } catch (err) {
      console.error('PDF Export Error:', err);
      alert('PDF 생성 중 오류가 발생했습니다.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="container animate-fade-in" style={{ paddingBottom: '4rem' }}>
      <header className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
        <div>
          <h1 className="title-gradient" style={{ fontSize: '2.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Globe size={36} color="#10b981" />
            글로벌 IB 매크로 브리핑
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem' }}>
            미국 5대 투자은행(Morgan Stanley, Goldman Sachs, JPMorgan, Bank of America, Citi)의 뷰를 1000자 내외로 심층 분석합니다.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            className="btn" 
            onClick={exportPDF} 
            disabled={isExporting || newsList.length === 0} 
            style={{ background: '#10b981', borderColor: '#10b981' }}
          >
            <Download size={18} style={{ marginRight: '0.5rem' }} /> {isExporting ? '생성 중...' : 'PDF 다운로드'}
          </button>
          <button className="btn" onClick={fetchBriefing} disabled={loading} style={{ background: '#10b981', borderColor: '#10b981' }}>
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} style={{ marginRight: '0.5rem' }} /> 업데이트
          </button>
        </div>
      </header>

      <div ref={reportRef} style={{ padding: '2rem', background: '#0a0a0c', borderRadius: '16px' }}>
      {error && (
        <div style={{ padding: '2rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '12px', textAlign: 'center', marginBottom: '2rem' }}>
          <h3>⚠️ 오류 발생</h3>
          <p>{error}</p>
        </div>
      )}

      {loading && newsList.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '5rem 0', color: '#10b981' }}>
          <div className="spinner" style={{ width: '50px', height: '50px', border: '4px solid rgba(16, 185, 129, 0.3)', borderTop: '4px solid #10b981', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1.5rem auto' }} />
          <h3>월스트리트에서 최신 기사 10개를 스크래핑하여 심층 분석을 작성 중입니다...</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>깊이 있는 통찰을 위해 약 20~30초 정도 소요될 수 있습니다.</p>
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          `}} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          {newsList.map((news, idx) => (
            <div key={idx} className="glass-panel" style={{ borderColor: 'rgba(16, 185, 129, 0.3)', position: 'relative' }}>
              <div style={{ position: 'absolute', top: '-15px', left: '2rem', background: '#10b981', color: '#fff', padding: '0.25rem 1rem', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.9rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                {news.ib_name}
              </div>
              
              <h2 style={{ fontSize: '1.75rem', color: '#fff', marginTop: '1rem', marginBottom: '2rem' }}>
                {news.headline}
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '12px', borderLeft: '4px solid var(--surface-border)' }}>
                  <h4 style={{ color: '#94a3b8', marginBottom: '0.75rem', textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '1px' }}>상황 요약 (Context)</h4>
                  <div className="markdown-content" style={{ fontSize: '1.1rem', lineHeight: '1.7' }}>
                    <ReactMarkdown>{news.context}</ReactMarkdown>
                  </div>
                </div>

                <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '1.5rem', borderRadius: '12px', borderLeft: '4px solid #10b981' }}>
                  <h4 style={{ color: '#10b981', marginBottom: '0.75rem', textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '1px' }}>IB의 뷰 (Insight)</h4>
                  <div className="markdown-content" style={{ fontSize: '1.15rem', lineHeight: '1.8', color: '#e2e8f0' }}>
                    <ReactMarkdown>{news.insight}</ReactMarkdown>
                  </div>
                </div>

                <div style={{ background: 'rgba(245, 158, 11, 0.05)', padding: '1.5rem', borderRadius: '12px', borderLeft: '4px solid #f59e0b' }}>
                  <h4 style={{ color: '#f59e0b', marginBottom: '0.75rem', textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '1px' }}>시장 파급 효과 (Impact)</h4>
                  <div className="markdown-content" style={{ fontSize: '1.1rem', lineHeight: '1.7' }}>
                    <ReactMarkdown>{news.impact}</ReactMarkdown>
                  </div>
                </div>
              </div>

              {news.url && (
                <div style={{ marginTop: '2rem', textAlign: 'right' }}>
                  <a href={news.url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem', transition: 'color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.color = '#10b981'} onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}>
                    원문 기사 보기 <ExternalLink size={14} />
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
