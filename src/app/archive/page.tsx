'use client';

import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Archive, Calendar, Building, Globe, Activity, X, Trash2, Download, Shield } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function ArchivePage() {
  const [activeTab, setActiveTab] = useState<'macro' | 'company' | 'ib'>('macro');
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // For modal/viewer
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [detailData, setDetailData] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchList(activeTab);
  }, [activeTab]);

  const fetchList = async (type: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/archive/list?type=${type}`);
      const json = await res.json();
      if (json.success) {
        setList(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (item: any) => {
    setSelectedItem(item);
    setDetailLoading(true);
    setDetailData(null);
    try {
      const res = await fetch(`/api/archive/detail?type=${activeTab}&file=${item.file}`);
      const json = await res.json();
      if (json.success) {
        setDetailData(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelectedItem(null);
    setDetailData(null);
  };

  const handleDelete = async (item: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`정말 해당 리포트(${item.date} ${item.ticker || ''})를 삭제하시겠습니까?`)) return;

    try {
      const res = await fetch(`/api/archive/delete?type=${activeTab}&file=${item.file}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        alert('삭제되었습니다.');
        fetchList(activeTab);
      } else {
        alert('삭제 실패: ' + json.error);
      }
    } catch (err) {
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  const exportPDF = () => {
    window.print();
  };

  return (
    <div className="container animate-fade-in" style={{ paddingBottom: '4rem' }}>
      <div className={selectedItem ? "no-print" : ""}>
        <header className="header no-print" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="title-gradient" style={{ fontSize: '2.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Archive size={36} color="var(--accent-color)" />
            과거 아카이브 도서관
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem' }}>
            이전에 분석했던 매크로, 기업 딥다이브, IB 브리핑의 기록을 날짜별로 다시 열람합니다.
          </p>
        </div>
        <div>
          <button 
            className="btn" 
            onClick={() => setIsAdmin(!isAdmin)}
            style={{ 
              background: isAdmin ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.05)', 
              borderColor: isAdmin ? '#ef4444' : 'var(--surface-border)',
              color: isAdmin ? '#ef4444' : 'var(--text-secondary)',
              display: 'flex', alignItems: 'center', gap: '0.5rem'
            }}
          >
            <Shield size={18} /> {isAdmin ? '관리자 모드 (ON)' : '관리자 모드 (OFF)'}
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="no-print" style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
        <button 
          className={`btn ${activeTab === 'macro' ? 'active' : 'ghost'}`} 
          onClick={() => setActiveTab('macro')}
          style={{ background: activeTab === 'macro' ? 'var(--accent-color)' : 'transparent', border: 'none' }}
        >
          <Activity size={18} style={{ marginRight: '0.5rem' }} /> 매크로 ETF 대시보드
        </button>
        <button 
          className={`btn ${activeTab === 'company' ? 'active' : 'ghost'}`} 
          onClick={() => setActiveTab('company')}
          style={{ background: activeTab === 'company' ? 'var(--accent-color)' : 'transparent', border: 'none' }}
        >
          <Building size={18} style={{ marginRight: '0.5rem' }} /> 기업 딥다이브
        </button>
        <button 
          className={`btn ${activeTab === 'ib' ? 'active' : 'ghost'}`} 
          onClick={() => setActiveTab('ib')}
          style={{ background: activeTab === 'ib' ? '#10b981' : 'transparent', border: 'none' }}
        >
          <Globe size={18} style={{ marginRight: '0.5rem' }} /> 글로벌 IB 브리핑
        </button>
      </div>

      {/* List */}
      <div style={{ minHeight: '400px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div className="spinner" style={{ margin: '0 auto' }}></div>
          </div>
        ) : list.length === 0 ? (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
            <Archive size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <h3>아직 저장된 아카이브가 없습니다.</h3>
            <p>분석을 실행하면 매일 시계열 별로 데이터가 누적됩니다.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {list.map((item, idx) => (
              <div 
                key={idx} 
                className="glass-panel" 
                style={{ cursor: 'pointer', transition: 'transform 0.2s', padding: '1.5rem' }}
                onClick={() => openDetail(item)}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'none'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  <Calendar size={16} /> {item.date}
                </div>
                {item.ticker ? (
                  <h3 style={{ fontSize: '1.5rem', color: '#fff', margin: 0 }}>
                    {item.ticker.toUpperCase()} 리포트
                  </h3>
                ) : (
                  <h3 style={{ fontSize: '1.3rem', color: '#fff', margin: 0 }}>
                    {activeTab === 'macro' ? '거시경제 종합 뷰' : '월스트리트 5대 IB 요약'}
                  </h3>
                )}
                
                {isAdmin && (
                  <button 
                    onClick={(e) => handleDelete(item, e)}
                    style={{ position: 'absolute', top: '1rem', right: '1rem', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.3)' }}
                    title="기록 영구 삭제"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      </div>

      {/* Detail Viewer Modal */}
      {selectedItem && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', 
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 1000,
          display: 'flex', flexDirection: 'column'
        }}>
          <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', padding: '1.5rem 2rem', background: '#0f172a', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>{selectedItem.date}</span>
              <span>{selectedItem.ticker ? `${selectedItem.ticker} 분석` : (activeTab === 'macro' ? '매크로 분석' : 'IB 브리핑')}</span>
            </h2>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                onClick={exportPDF} 
                disabled={isExporting || detailLoading}
                className="btn"
                style={{ background: '#10b981', borderColor: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}
              >
                <Download size={18} /> {isExporting ? '저장 중...' : 'PDF 리포트 다운로드'}
              </button>
              <button onClick={closeDetail} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
                <X size={32} />
              </button>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '2rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
            {detailLoading ? (
              <div style={{ textAlign: 'center', padding: '5rem' }}>
                <div className="spinner" style={{ margin: '0 auto' }}></div>
              </div>
            ) : detailData ? (
              <div ref={modalRef} className="animate-fade-in" style={{ padding: '2rem', background: '#0a0a0c', borderRadius: '16px' }}>
                {activeTab === 'ib' && Array.isArray(detailData) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {detailData.map((news: any, i: number) => (
                      <div key={i} className="glass-panel" style={{ borderColor: '#10b981' }}>
                         <h3 style={{ color: '#10b981' }}>{news.ib_name} - {news.headline}</h3>
                         <div className="markdown-content"><ReactMarkdown remarkPlugins={[remarkGfm]}>{news.insight}</ReactMarkdown></div>
                      </div>
                    ))}
                  </div>
                )}
                {activeTab === 'company' && detailData.fundamental && detailData.technical && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4rem' }}>
                    <div>
                      <h2 style={{ color: 'var(--accent-color)', borderBottom: '2px solid var(--accent-color)', paddingBottom: '1rem', marginBottom: '2rem' }}>📊 기본적 분석 리포트</h2>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        {detailData.fundamental.sections?.map((item: any, i: number) => (
                          <div key={i} className="glass-panel">
                            <h2>{i+1}. {item.title}</h2>
                            <div className="markdown-content"><ReactMarkdown remarkPlugins={[remarkGfm]}>{item.content}</ReactMarkdown></div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h2 style={{ color: '#10b981', borderBottom: '2px solid #10b981', paddingBottom: '1rem', marginBottom: '2rem' }}>📈 기술적 분석 리포트</h2>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        {detailData.technical.sections?.map((item: any, i: number) => (
                          <div key={i} className="glass-panel" style={{ borderColor: '#10b981' }}>
                            <h2>{i+1}. {item.title}</h2>
                            <div className="markdown-content"><ReactMarkdown remarkPlugins={[remarkGfm]}>{item.content}</ReactMarkdown></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {activeTab === 'company' && (detailData.slides || detailData.sections) && !detailData.fundamental && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {(detailData.sections || detailData.slides).map((item: any, i: number) => (
                      <div key={i} className="glass-panel">
                        <h2>{i+1}. {item.title}</h2>
                        <div className="markdown-content"><ReactMarkdown remarkPlugins={[remarkGfm]}>{item.content}</ReactMarkdown></div>
                      </div>
                    ))}
                  </div>
                )}
                {activeTab === 'macro' && detailData.explanation && (
                  <div className="glass-panel">
                    <div className="markdown-content"><ReactMarkdown remarkPlugins={[remarkGfm]}>{detailData.explanation}</ReactMarkdown></div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ color: 'red', textAlign: 'center' }}>데이터를 불러올 수 없습니다.</div>
            )}
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .ghost:hover { background: rgba(255,255,255,0.1) !important; }
      `}} />
    </div>
  );
}
