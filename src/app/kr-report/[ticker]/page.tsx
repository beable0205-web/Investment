import fs from 'fs';
import path from 'path';

export default function KrReportPage({ params, searchParams }: { params: { ticker: string }, searchParams: { type?: string } }) {
  const ticker = params.ticker;
  const type = searchParams.type || 'BUY';

  let reportData = null;

  try {
    if (type === 'SELL') {
      const dbPath = path.join(process.cwd(), 'src', 'data', 'archive', 'kr_sell_reports.json');
      if (fs.existsSync(dbPath)) {
        const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
        // 가장 최근 리포트 찾기
        reportData = db.reports.filter((r: any) => r.ticker === ticker).pop();
      }
    } else {
      const dbPath = path.join(process.cwd(), 'src', 'data', 'archive', 'kr_fundamental_reports.json');
      if (fs.existsSync(dbPath)) {
        const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
        reportData = db.reports.filter((r: any) => r.ticker === ticker).pop();
      }
    }
  } catch (e) {
    console.error(e);
  }

  if (!reportData) {
    return (
      <div className="min-h-screen bg-[#0d1117] text-white flex items-center justify-center p-6">
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-8 max-w-lg w-full text-center">
          <h1 className="text-2xl font-bold mb-4">리포트를 찾을 수 없습니다</h1>
          <p className="text-gray-400">요청하신 종목({ticker})의 {type} 분석 리포트가 존재하지 않습니다.</p>
        </div>
      </div>
    );
  }

  const ai = reportData.aiAnalysis;

  return (
    <div className="min-h-screen bg-[#0d1117] text-gray-200 font-sans p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-purple-600"></div>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2">{reportData.companyName} <span className="text-xl text-gray-500 font-normal">({ticker})</span></h1>
              <p className="text-gray-400 text-sm">{new Date(reportData.date).toLocaleString('ko-KR')}</p>
            </div>
            <div className={`px-4 py-2 rounded-lg font-bold text-lg ${type === 'BUY' ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-red-500/20 text-red-400 border border-red-500/50'}`}>
              {type === 'BUY' ? 'BUY SIGNAL' : 'SELL SIGNAL'}
            </div>
          </div>
        </div>

        {/* AI Final Decision */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 bg-[#161b22] border border-[#30363d] rounded-2xl p-6 flex flex-col justify-center items-center text-center shadow-lg">
            <h2 className="text-gray-400 font-semibold mb-2">AI 최종 판정</h2>
            <div className={`text-5xl font-black mb-4 ${ai.final_decision === 'BUY' ? 'text-green-500' : ai.final_decision === 'SELL' ? 'text-red-500' : 'text-yellow-500'}`}>
              {ai.final_decision}
            </div>
            {type === 'BUY' && (
              <div className="bg-[#0d1117] px-4 py-3 rounded-xl border border-[#30363d] w-full">
                <span className="text-gray-400 text-sm block mb-1">목표 도달 확률</span>
                <span className="text-2xl font-bold text-white">{ai.target_return_probability}%</span>
              </div>
            )}
          </div>

          <div className="md:col-span-2 bg-[#161b22] border border-[#30363d] rounded-2xl p-6 shadow-lg">
            <h2 className="text-xl font-bold text-white mb-4 border-b border-[#30363d] pb-2">🎯 액션 플랜 (Action Plan)</h2>
            <p className="text-lg leading-relaxed text-blue-100">{ai.action_plan}</p>
          </div>
        </div>

        {/* Detailed Analysis (BUY) */}
        {type === 'BUY' && (
          <div className="space-y-6">
            <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 shadow-lg">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <span>📈</span> 기술적 타점 (Technical Synergy)
              </h2>
              <div className="bg-[#0d1117] rounded-xl p-4 border border-[#30363d] mb-4">
                <p className="font-semibold text-purple-400 mb-1">포착된 알고리즘 룰:</p>
                <p className="text-gray-300">{reportData.technicalReasons?.[0]}</p>
              </div>
              <p className="text-gray-300 leading-relaxed">{ai.technical_synergy}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 shadow-lg">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span>💼</span> 비즈니스 요약
                </h2>
                <p className="text-gray-300 leading-relaxed">{ai.business_summary}</p>
              </div>
              
              <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 shadow-lg">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span>🔥</span> 모멘텀 분석
                </h2>
                <p className="text-gray-300 leading-relaxed">{ai.momentum_analysis}</p>
              </div>
            </div>

            <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 shadow-lg">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <span>💰</span> 밸류에이션 평가
              </h2>
              <p className="text-gray-300 leading-relaxed mb-6">{ai.valuation_analysis}</p>
              
              {reportData.rawFinancials && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: '시가총액', value: reportData.rawFinancials.marketCap },
                    { label: 'PER', value: reportData.rawFinancials.per },
                    { label: 'PBR', value: reportData.rawFinancials.pbr },
                    { label: 'ROE/EPS', value: reportData.rawFinancials.eps },
                  ].map((item, i) => (
                    <div key={i} className="bg-[#0d1117] border border-[#30363d] rounded-lg p-3 text-center">
                      <div className="text-xs text-gray-500 mb-1">{item.label}</div>
                      <div className="font-bold text-gray-200">{item.value}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Detailed Analysis (SELL) */}
        {type === 'SELL' && (
          <div className="space-y-6">
            <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 shadow-lg border-l-4 border-l-red-500">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <span>🚨</span> 발생 사유 (Trigger Reason)
              </h2>
              <p className="text-lg text-red-300 font-semibold">{reportData.alertReason}</p>
            </div>

            <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 shadow-lg">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <span>📉</span> 위기 심층 분석 (Crisis Analysis)
              </h2>
              <p className="text-gray-300 leading-relaxed">{ai.crisis_analysis}</p>
            </div>

            <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 shadow-lg">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <span>✂️</span> 차트 데미지 평가 (Technical Impact)
              </h2>
              <p className="text-gray-300 leading-relaxed">{ai.technical_impact}</p>
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex justify-center pt-4 pb-10">
          <a 
            href={`https://finance.naver.com/item/main.naver?code=${ticker.replace(/\.KS|\.KQ/gi, '')}`} 
            target="_blank"
            rel="noreferrer"
            className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-8 rounded-full shadow-lg shadow-green-900/50 transition-all transform hover:scale-105"
          >
            네이버 차트 직접 확인하기
          </a>
        </div>
      </div>
    </div>
  );
}
