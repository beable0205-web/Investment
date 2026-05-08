"use client";

import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { Activity, TrendingUp, RefreshCw, BarChart2, Globe, Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [archivedPapers, setArchivedPapers] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/analyze');
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setData(json.data);

      try {
        const pRes = await fetch('/api/archive');
        const pJson = await pRes.json();
        if (pJson.success) setArchivedPapers(pJson.data);
      } catch (e) {
        console.error('Failed to load archived data');
      }

      try {
        const lRes = await fetch('/api/lessons');
        const lJson = await lRes.json();
        if (lJson.success) setLessons(lJson.data);
      } catch (e) {
        console.error('Failed to load lessons');
      }
    } catch (err: any) {
      setError(err.message);
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
        backgroundColor: '#0a0a0c' // 배경색을 홈페이지 톤으로 고정 (투명도 이슈 해결)
      });
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const pdfWidth = 297;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Macro_ETF_Dashboard.pdf`);
    } catch (err) {
      console.error('PDF Export Error:', err);
      alert('PDF 생성 중 오류가 발생했습니다.');
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <RefreshCw className="animate-spin" size={48} color="var(--accent-color)" style={{ marginBottom: '1rem' }} />
        <h2 className="title-gradient animate-fade-in">시장을 분석하고 있습니다...</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>AI가 매크로 데이터와 최신 뉴스를 융합하여 인사이트를 도출합니다.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="glass-panel" style={{ borderColor: 'var(--danger-color)' }}>
          <h2 style={{ color: 'var(--danger-color)' }}>오류가 발생했습니다</h2>
          <p>{error}</p>
          <button className="btn" style={{ marginTop: '1rem' }} onClick={fetchData}>다시 시도</button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { macroData, etfData, newsData, analysis } = data;

  return (
    <div className="container animate-fade-in">
      <header style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 className="title-gradient" style={{ fontSize: '2.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Activity size={36} color="var(--accent-color)" />
            AI 매크로 퀀트 데스크
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem' }}>
            실시간 거시경제 지표와 뉴스를 분석한 AI 자산배분 전략
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            className="btn" 
            onClick={exportPDF} 
            disabled={isExporting}
            style={{ background: '#10b981', borderColor: '#10b981' }}
          >
            <Download size={18} style={{ marginRight: '0.5rem' }} /> 
            {isExporting ? 'PDF 생성 중...' : 'PDF 다운로드'}
          </button>
          <button className="btn" onClick={fetchData}>
            <RefreshCw size={18} style={{ marginRight: '0.5rem' }} /> 업데이트
          </button>
        </div>
      </header>

      <div ref={reportRef} style={{ padding: '2rem', background: '#0a0a0c', borderRadius: '16px' }}>
        <div className="grid-2" style={{ marginBottom: '2rem' }}>
          {/* 거시경제 지표 */}
        <div className="glass-panel">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <BarChart2 size={24} color="var(--accent-color)" /> 핵심 거시경제 지표
          </h3>
          <div className="grid-3">
            <div className="metric-card">
              <span className="metric-label">장단기 금리차 (10Y-2Y)</span>
              <span className={`metric-value ${Number(macroData.yieldCurve) > 0 ? 'metric-positive' : 'metric-negative'}`}>
                {macroData.yieldCurve}%
              </span>
            </div>
            <div className="metric-card">
              <span className="metric-label">M2 유동성 (10억$)</span>
              <span className="metric-value">{macroData.m2 || 'N/A'}</span>
            </div>
            <div className="metric-card">
              <span className="metric-label">미국 실업률</span>
              <span className="metric-value">{macroData.unemploymentRate}%</span>
            </div>
          </div>
        </div>

        {/* 현재 국면 진단 */}
        <div className="glass-panel" style={{ background: 'linear-gradient(145deg, rgba(79, 70, 229, 0.1), rgba(20, 20, 25, 0.8))' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <TrendingUp size={24} color="var(--success-color)" /> AI 국면 진단
          </h3>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>
            {analysis.regime}
          </div>
          <p style={{ color: 'var(--text-secondary)' }}>
            현재 시장의 데이터 구조와 뉴스 흐름을 기반으로 평가된 국면입니다.
          </p>
        </div>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        {/* 포트폴리오 비중 차트 (가로막대) */}
        <div className="glass-panel" style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>최적화 ETF 포트폴리오 비중</h3>
          <div style={{ width: '100%', height: '350px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={analysis.portfolio}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="ticker" type="category" stroke="var(--text-secondary)" width={60} tick={{ fontSize: 14, fill: '#fff' }} />
                <RechartsTooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: 'rgba(20, 20, 25, 0.9)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                  formatter={(value: any) => [`${value}%`, '비중']}
                />
                <Bar dataKey="weight" radius={[0, 4, 4, 0]}>
                  {analysis.portfolio.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                  <LabelList 
                    dataKey="weight" 
                    position="right" 
                    fill="#fff" 
                    formatter={(value: any) => `${value}%`}
                    style={{ fontSize: '14px', fontWeight: 'bold' }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* XAI 투자 논리 리포트 */}
        <div className="glass-panel">
          <h3 style={{ marginBottom: '1.5rem' }}>AI 투자 논리 (XAI)</h3>
          <div className="markdown-content">
            <ReactMarkdown>{analysis.explanation}</ReactMarkdown>
          </div>
        </div>
      </div>

      {/* 심층 맞춤형 뉴스 (Tailored News) */}
      <div className="glass-panel" style={{ marginBottom: '2rem' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <Globe size={24} color="var(--accent-color)" /> 맞춤형 심층 뉴스 분석 (Second-Level Thinking)
        </h3>
        <ul style={{ listStyleType: 'none', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {analysis.tailored_news?.map((news: any, idx: number) => (
            <li key={idx} style={{ paddingBottom: '1.5rem', borderBottom: '1px solid var(--surface-border)' }}>
              <div style={{ fontWeight: 600, fontSize: '1.2rem', marginBottom: '0.75rem', color: '#e0e7ff' }}>
                {news.title}
              </div>
              <div style={{ padding: '1rem', background: 'rgba(79, 70, 229, 0.05)', borderLeft: '4px solid var(--accent-color)', borderRadius: '0 8px 8px 0', color: '#c7d2fe', lineHeight: 1.6 }}>
                <strong>Insight:</strong> {news.insight}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* 투자 리서치 아카이브 (Paper Archive) */}
      <div className="glass-panel" style={{ marginBottom: '2rem' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          📚 데일리 투자 논문 아카이브
        </h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          현재 시장 사이클과 완벽히 일치하는 대가들의 메모와 투자 논문을 요약해 드립니다.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
          {/* 오늘자 논문 (분석 결과) */}
          {analysis.recommended_papers?.map((paper: any, idx: number) => (
            <div key={`today-${idx}`} style={{ padding: '2rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '16px', border: '1px solid var(--surface-border)' }}>
              <div style={{ display: 'inline-block', padding: '0.25rem 0.75rem', background: 'var(--accent-color)', color: '#fff', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '1rem' }}>Today's Pick</div>
              <h4 style={{ color: '#fff', marginBottom: '0.75rem', fontSize: '1.4rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '0.75rem' }}>{paper.title}</h4>
              <p style={{ color: 'var(--accent-color)', fontSize: '1rem', fontWeight: 600, marginBottom: '1.5rem' }}>저자: {paper.author}</p>
              <div className="markdown-content" style={{ color: '#c7d2fe', fontSize: '1.05rem', lineHeight: 1.8 }}>
                <ReactMarkdown>{paper.summary}</ReactMarkdown>
              </div>
            </div>
          ))}

          {/* 과거 데일리 리포트 아카이브 폴더 리스트 */}
          {archivedPapers.length > 0 && (
            <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--surface-border)' }}>
              <h4 style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                📁 과거 데일리 리포트 아카이브
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {archivedPapers.map((archive, archiveIdx) => (
                  <details key={archiveIdx} style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '8px', border: '1px solid var(--surface-border)' }}>
                    <summary style={{ padding: '1rem', cursor: 'pointer', fontWeight: 'bold', color: '#fff', fontSize: '1.1rem' }}>
                      📅 {archive.date} 종합 리포트 열기
                    </summary>
                    <div style={{ padding: '1.5rem', borderTop: '1px solid var(--surface-border)' }}>
                      
                      {/* 과거 투자 논리 */}
                      {archive.analysis?.explanation && (
                        <div style={{ marginBottom: '2rem' }}>
                          <h5 style={{ color: '#e0e7ff', fontSize: '1.2rem', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>🧠 AI 투자 논리</h5>
                          <div className="markdown-content" style={{ color: '#9ba1a6', fontSize: '0.95rem' }}>
                            <ReactMarkdown>{archive.analysis.explanation}</ReactMarkdown>
                          </div>
                        </div>
                      )}

                      {/* 과거 맞춤 뉴스 */}
                      {archive.analysis?.tailored_news?.length > 0 && (
                        <div style={{ marginBottom: '2rem' }}>
                          <h5 style={{ color: '#e0e7ff', fontSize: '1.2rem', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>🌐 맞춤형 심층 뉴스</h5>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {archive.analysis.tailored_news.map((news: any, nIdx: number) => (
                              <div key={nIdx} style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px' }}>
                                <div style={{ color: '#fff', fontWeight: 'bold', marginBottom: '0.5rem' }}>{news.title}</div>
                                <div style={{ color: '#c7d2fe', fontSize: '0.9rem' }}>Insight: {news.insight}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 과거 투자 논문 */}
                      {archive.analysis?.recommended_papers?.length > 0 && (
                        <div>
                          <h5 style={{ color: '#e0e7ff', fontSize: '1.2rem', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>📚 투자 논문 아카이브</h5>
                          {archive.analysis.recommended_papers.map((paper: any, pIdx: number) => (
                            <div key={pIdx} style={{ marginBottom: pIdx < archive.analysis.recommended_papers.length - 1 ? '1.5rem' : 0 }}>
                              <h6 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '0.25rem' }}>{paper.title}</h6>
                              <p style={{ color: 'var(--accent-color)', fontSize: '0.9rem', marginBottom: '0.75rem' }}>저자: {paper.author}</p>
                              <div className="markdown-content" style={{ color: '#9ba1a6', fontSize: '0.95rem' }}>
                                <ReactMarkdown>{paper.summary}</ReactMarkdown>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                    </div>
                  </details>
                ))}
              </div>
            </div>
          )}

          {/* AI 진화 일지 (Evolution Log) */}
          {lessons.length > 0 && (
            <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--surface-border)' }}>
              <h4 style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                🧬 AI 진화 및 성장 일지 (Evolution Log)
              </h4>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                AI가 과거의 오판과 성과를 스스로 복기하고, 다음 예측을 위해 뇌에 각인시킨 핵심 투자 원칙들입니다.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
                {lessons.map((lesson, idx) => (
                  <div key={idx} style={{ padding: '1.5rem', background: 'rgba(79, 70, 229, 0.05)', borderRadius: '12px', borderLeft: '4px solid var(--accent-color)', border: '1px solid var(--surface-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <span style={{ fontWeight: 'bold', color: '#fff', fontSize: '1.1rem' }}>📌 도출된 원칙 (Principle)</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>📅 {lesson.date}</span>
                    </div>
                    <div style={{ color: 'var(--accent-color)', fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.5rem', lineHeight: 1.5 }}>
                      "{lesson.principle}"
                    </div>
                    <h6 style={{ color: '#e0e7ff', marginBottom: '0.5rem', fontSize: '1rem' }}>자기 성찰 기록 (Reflection)</h6>
                    <div className="markdown-content" style={{ color: '#9ba1a6', fontSize: '0.95rem', lineHeight: 1.6 }}>
                      <ReactMarkdown>{lesson.reflection}</ReactMarkdown>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      </div>

      {/* 팟캐스트 플레이어 */}
      <div className="glass-panel" style={{ marginTop: '2rem' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          🎙️ 데일리 팟캐스트 리포트
        </h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          수석 퀀트 분석가와 역사학자가 오늘 시장의 핵심을 대담 형식으로 전달합니다. (Google Cloud TTS 연동)
        </p>
        <button 
          className="btn" 
          onClick={async (e) => {
            const btn = e.currentTarget;
            btn.disabled = true;
            btn.innerText = '대본 및 오디오 생성 중...';
            try {
              const res = await fetch('/api/podcast', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ explanation: analysis.explanation })
              });
              const json = await res.json();
              if (json.success && json.data.script) {
                alert('팟캐스트가 성공적으로 생성되었습니다! (실제 오디오 플레이어 UI는 확장 예정)');
                console.log('Podcast Script & Audio:', json.data.script);
              } else {
                throw new Error(json.error || 'Failed to generate podcast');
              }
            } catch (err) {
              alert('팟캐스트 생성 실패: ' + err);
            } finally {
              btn.disabled = false;
              btn.innerText = '🎧 팟캐스트 생성 및 듣기';
            }
          }}
        >
          🎧 팟캐스트 생성 및 듣기
        </button>
      </div>

    </div>
  );
}
