import fs from 'fs';
import path from 'path';

export function generateHtmlReport(stockName: string, ticker: string, aiReport: any): string {
  const htmlContent = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>[SMIC Style] ${stockName} 심층 기본적 분석 리포트</title>
  <style>
    body {
      font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      background-color: #f9fafb;
    }
    .report-container {
      background: #ffffff;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.05);
      border-top: 8px solid #1e3a8a;
    }
    .header {
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .badge {
      display: inline-block;
      padding: 6px 12px;
      background: #dcfce7;
      color: #166534;
      border-radius: 20px;
      font-weight: bold;
      font-size: 14px;
      margin-bottom: 15px;
    }
    h1 {
      margin: 0 0 10px 0;
      color: #111827;
      font-size: 32px;
    }
    .date {
      color: #6b7280;
      font-size: 14px;
    }
    h2 {
      color: #1e3a8a;
      border-bottom: 1px solid #bfdbfe;
      padding-bottom: 8px;
      margin-top: 30px;
      font-size: 22px;
    }
    .section {
      margin-bottom: 25px;
    }
    .highlight-box {
      background: #eff6ff;
      border-left: 4px solid #3b82f6;
      padding: 15px 20px;
      margin: 20px 0;
      border-radius: 0 8px 8px 0;
    }
    .highlight-box p {
      margin: 0;
      font-weight: 600;
      color: #1e40af;
    }
    .content-text {
      white-space: pre-line;
      color: #4b5563;
      font-size: 16px;
    }
    .footer {
      margin-top: 50px;
      text-align: center;
      color: #9ca3af;
      font-size: 12px;
      border-top: 1px solid #e5e7eb;
      padding-top: 20px;
    }
  </style>
</head>
<body>
  <div class="report-container">
    <div class="header">
      <div class="badge">SMIC Style Deep Dive Report</div>
      <h1>${stockName} <span style="color:#6b7280; font-size:24px;">(${ticker})</span></h1>
      <div class="date">발행일: ${new Date().toLocaleDateString('ko-KR')} | 투자 AI 멘토 자동 생성</div>
    </div>

    <div class="highlight-box">
      <p>🎯 AI 최종 판정: ${aiReport.final_decision} (예상 승률: ${aiReport.target_return_probability || 'N/A'}%)</p>
    </div>

    <div class="section">
      <h2>💼 비즈니스 핵심 요약</h2>
      <div class="content-text">${aiReport.business_summary || '내용 없음'}</div>
    </div>

    <div class="section">
      <h2>🔥 단기 모멘텀 & 촉매제</h2>
      <div class="content-text">${aiReport.momentum_analysis || '내용 없음'}</div>
    </div>

    <div class="section">
      <h2>📈 기술적 시너지 (차트 타점)</h2>
      <div class="content-text">${aiReport.technical_synergy || '내용 없음'}</div>
    </div>

    <div class="section">
      <h2>💰 밸류에이션 점검</h2>
      <div class="content-text">${aiReport.valuation_analysis || '내용 없음'}</div>
    </div>

    <div class="section" style="background: #fdf2f8; padding: 20px; border-radius: 8px; border-left: 4px solid #db2777;">
      <h2 style="color: #9d174d; border:none; margin-top:0; padding-bottom:0;">🚀 최종 액션 플랜</h2>
      <div class="content-text" style="color: #831843; font-weight: 500;">${aiReport.action_plan || '내용 없음'}</div>
    </div>

    <div class="footer">
      본 리포트는 알고리즘 스크리닝과 Gemini AI를 기반으로 자동 생성된 딥다이브 리포트입니다.<br>
      투자의 최종 판단과 책임은 투자자 본인에게 있습니다.
    </div>
  </div>
</body>
</html>
  `;

  // 저장 디렉토리 확인
  const outputDir = path.join(process.cwd(), 'src', 'data', 'reports');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 파일명 포맷: [SMIC_DeepDive]_삼성전자_20231010.html
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const safeName = stockName.replace(/[<>:"\/\\|?*]+/g, '');
  const fileName = `[SMIC_DeepDive]_${safeName}_${dateStr}.html`;
  const filePath = path.join(outputDir, fileName);

  fs.writeFileSync(filePath, htmlContent, 'utf8');
  return filePath;
}

export function generateHtmlSellReport(stockName: string, ticker: string, alertReason: string, aiReport: any): string {
  const htmlContent = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>[매도 청산 보고서] ${stockName}</title>
  <style>
    body {
      font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      background-color: #f9fafb;
    }
    .report-container {
      background: #ffffff;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.05);
      border-top: 8px solid #b91c1c; /* 붉은 계열 테마 */
    }
    .header {
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .badge {
      display: inline-block;
      padding: 6px 12px;
      background: #fee2e2;
      color: #991b1b;
      border-radius: 20px;
      font-weight: bold;
      font-size: 14px;
      margin-bottom: 15px;
    }
    h1 {
      margin: 0 0 10px 0;
      color: #111827;
      font-size: 32px;
    }
    .date {
      color: #6b7280;
      font-size: 14px;
    }
    h2 {
      color: #991b1b;
      border-bottom: 1px solid #fecaca;
      padding-bottom: 8px;
      margin-top: 30px;
      font-size: 22px;
    }
    .section {
      margin-bottom: 25px;
    }
    .highlight-box {
      background: #fef2f2;
      border-left: 4px solid #ef4444;
      padding: 15px 20px;
      margin: 20px 0;
      border-radius: 0 8px 8px 0;
    }
    .highlight-box p {
      margin: 0;
      font-weight: 600;
      color: #991b1b;
    }
    .content-text {
      white-space: pre-line;
      color: #4b5563;
      font-size: 16px;
    }
    .footer {
      margin-top: 50px;
      text-align: center;
      color: #9ca3af;
      font-size: 12px;
      border-top: 1px solid #e5e7eb;
      padding-top: 20px;
    }
  </style>
</head>
<body>
  <div class="report-container">
    <div class="header">
      <div class="badge">수석 펀드매니저 특별 브리핑 (LP 전용)</div>
      <h1>${stockName} <span style="color:#6b7280; font-size:24px;">(${ticker}) 매도 보고서</span></h1>
      <div class="date">발행일: ${new Date().toLocaleDateString('ko-KR')} | 투자 AI 멘토 자동 생성</div>
    </div>

    <div class="highlight-box">
      <p>🚨 발생 사유: ${alertReason}</p>
      <p style="margin-top:8px;">💡 AI 최종 건의: ${aiReport.final_decision}</p>
    </div>

    <div class="section">
      <h2>💼 현재 기업 현황 및 노이즈 점검</h2>
      <div class="content-text">${aiReport.company_status || '내용 없음'}</div>
    </div>

    <div class="section">
      <h2>✂️ 펀드매니저의 매도(청산) 사유</h2>
      <div class="content-text">${aiReport.sell_reason || '내용 없음'}</div>
    </div>

    <div class="section">
      <h2>📉 기술적 데미지 및 향후 차트 전망</h2>
      <div class="content-text">${aiReport.technical_impact || '내용 없음'}</div>
    </div>

    <div class="section" style="background: #fdf2f8; padding: 20px; border-radius: 8px; border-left: 4px solid #db2777;">
      <h2 style="color: #9d174d; border:none; margin-top:0; padding-bottom:0;">👑 쩐주(대표님)께 올리는 최종 코멘트</h2>
      <div class="content-text" style="color: #831843; font-weight: 500;">${aiReport.action_plan || '내용 없음'}</div>
    </div>

    <div class="footer">
      본 리포트는 알고리즘 스크리닝과 Gemini AI를 기반으로 자동 생성된 기안서입니다.<br>
      투자의 최종 판단과 책임은 투자자 본인에게 있습니다.
    </div>
  </div>
</body>
</html>
  `;

  const outputDir = path.join(process.cwd(), 'src', 'data', 'reports');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const safeName = stockName.replace(/[<>:"\/\\|?*]+/g, '');
  const fileName = `[매도보고서]_${safeName}_${dateStr}.html`;
  const filePath = path.join(outputDir, fileName);

  fs.writeFileSync(filePath, htmlContent, 'utf8');
  return filePath;
}
