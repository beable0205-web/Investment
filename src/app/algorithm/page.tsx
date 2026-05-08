'use client';

import { BookOpen, TrendingUp, Anchor, Activity, Zap } from 'lucide-react';

export default function AlgorithmPage() {
  return (
    <div className="container animate-fade-in" style={{ paddingBottom: '4rem' }}>
      <header className="header" style={{ marginBottom: '3rem' }}>
        <h1 className="title-gradient" style={{ fontSize: '3rem', display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <BookOpen size={40} color="#8b5cf6" />
          알고리즘 명세서
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.25rem', maxWidth: '800px', lineHeight: '1.6' }}>
          본 퀀트 자동 매매 시스템은 시장의 노이즈를 배제하고, 철저하게 검증된 <strong>단테의 기술적 분석 철학</strong>을 수학적 알고리즘으로 치환하여 구동됩니다. 백테스팅과 실전 매매의 기준이 되는 4가지 핵심 로직을 공개합니다.
        </p>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* 매수 기법 1 */}
        <div className="glass-panel" style={{ padding: '2.5rem', borderLeft: '6px solid #10b981', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', opacity: 0.05, transform: 'rotate(15deg)' }}>
            <TrendingUp size={200} />
          </div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '0.5rem 1rem', borderRadius: '999px', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '1rem' }}>
              Buy Signal 1
            </div>
            <h2 style={{ fontSize: '2rem', color: '#fff', margin: '0 0 1rem 0' }}>밥그릇 3번 자리 (224일선 눌림목)</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', lineHeight: '1.7', marginBottom: '1.5rem' }}>
              <strong>개념:</strong> 주가가 하락(1번)과 긴 횡보(2번)를 거쳐 세력의 매집이 끝난 후, 1년 장기 이평선인 224일선을 강하게 돌파하고 다시 지지선(224일선) 근처로 살짝 눌러주는 <strong>대시세 출발 직전의 황금 타점</strong>입니다.
            </p>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h4 style={{ margin: '0 0 0.75rem 0', color: '#10b981' }}>봇의 수식 로직</h4>
              <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#d1d5db', lineHeight: '1.6' }}>
                <li>종가가 224일 이동평균선 근처 (괴리율 -2% ~ +5% 이내)에 위치할 것.</li>
                <li>최근 20거래일 이내에 거래량이 평소 20일 평균 대비 250% 이상 터진 '매집봉(기준봉)' 흔적이 존재할 것.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 매수 기법 2 */}
        <div className="glass-panel" style={{ padding: '2.5rem', borderLeft: '6px solid #3b82f6', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', opacity: 0.05, transform: 'rotate(-10deg)' }}>
            <Anchor size={200} />
          </div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '0.5rem 1rem', borderRadius: '999px', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '1rem' }}>
              Buy Signal 2
            </div>
            <h2 style={{ fontSize: '2rem', color: '#fff', margin: '0 0 1rem 0' }}>엔벨롭 낙폭과대 (바닥 낚시)</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', lineHeight: '1.7', marginBottom: '1.5rem' }}>
              <strong>개념:</strong> 단기 악재나 시장의 투매로 인해 주가가 비정상적으로 폭락했을 때 사용하는 기법입니다. 세력의 평단가마저 깨고 내려간 과매도 구간에서는 강력한 기술적 반등이 일어난다는 성질을 이용합니다.
            </p>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h4 style={{ margin: '0 0 0.75rem 0', color: '#3b82f6' }}>봇의 수식 로직</h4>
              <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#d1d5db', lineHeight: '1.6' }}>
                <li>20일 이동평균선 기준 Envelope(20, 20) 하단선을 주가가 터치하거나 하향 돌파할 것.</li>
                <li>반등 시 일차적 목표가인 20일선 저항대에서 즉시 전량 익절 처리.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 매수 기법 3 */}
        <div className="glass-panel" style={{ padding: '2.5rem', borderLeft: '6px solid #f59e0b', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', opacity: 0.05, transform: 'rotate(5deg)' }}>
            <Activity size={200} />
          </div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', padding: '0.5rem 1rem', borderRadius: '999px', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '1rem' }}>
              Buy Signal 3
            </div>
            <h2 style={{ fontSize: '2rem', color: '#fff', margin: '0 0 1rem 0' }}>대량 거래 동반 역주행 양봉</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', lineHeight: '1.7', marginBottom: '1.5rem' }}>
              <strong>개념:</strong> 전날 하락(음봉)으로 개미들을 털어낸 뒤, 다음 날 전날의 하락분을 모조리 잡아먹는 거대한 양봉이 터지는 패턴입니다. 개인 투자자의 물량으로는 절대 만들 수 없는 <strong>세력의 강력한 상승 의지(개입)</strong>를 포착합니다.
            </p>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h4 style={{ margin: '0 0 0.75rem 0', color: '#f59e0b' }}>봇의 수식 로직</h4>
              <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#d1d5db', lineHeight: '1.6' }}>
                <li>전날 종가가 시가보다 낮은 '음봉'일 것.</li>
                <li>오늘 시가가 어제 종가보다 낮게 출발했음에도 불구하고, 오늘 종가가 어제 시가를 돌파하는 '상승 장악형 양봉'일 것.</li>
                <li>오늘 거래량이 어제 거래량의 최소 200% 이상 폭발할 것.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 매도 기법 (추세 추종) */}
        <div className="glass-panel" style={{ padding: '2.5rem', borderLeft: '6px solid #ef4444', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', opacity: 0.05, transform: 'rotate(-5deg)' }}>
            <Zap size={200} />
          </div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.5rem 1rem', borderRadius: '999px', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '1rem' }}>
              Exit Rule
            </div>
            <h2 style={{ fontSize: '2rem', color: '#fff', margin: '0 0 1rem 0' }}>대시세 추세 추종 (Ride the Trend)</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', lineHeight: '1.7', marginBottom: '1.5rem' }}>
              <strong>개념:</strong> 세력이 주가를 띄우기 시작했다면 고작 10%를 먹고 파는 것은 황금알을 낳는 거위의 배를 가르는 것입니다. 상승 추세가 꺾이거나 세력이 물량을 떠넘기는 '이상 징후'가 감지될 때까지 끝까지 버텨 대시세(+50% ~ +200%)를 발라먹는 전략입니다.
            </p>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h4 style={{ margin: '0 0 0.75rem 0', color: '#ef4444' }}>봇의 수식 로직</h4>
              <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#d1d5db', lineHeight: '1.6' }}>
                <li style={{ marginBottom: '0.5rem' }}><strong>🎯 추세 끝 (20일선 데드크로스 이탈):</strong> 밥그릇 3번 자리(224일선) 매수 시, 주가가 상승하며 20일선을 타고 올라가다가 종가 기준으로 20일선을 뚫고 밑으로 내려올 때 추세 이탈로 판단하여 전량 익절.</li>
                <li style={{ marginBottom: '0.5rem' }}><strong>🎯 20일선 저항 도달 (엔벨롭 익절):</strong> 엔벨롭 하단(바닥) 매수 시, 단기 낙폭과대에 따른 기술적 반등의 1차 목표가인 20일선에 도달하거나 상향 돌파(골든크로스)할 때 즉시 전량 익절.</li>
                <li style={{ marginBottom: '0.5rem' }}><strong>⚠️ 세력 이탈 (고점 대량 음봉):</strong> 수익 구간에서 평소 20일 평균 거래량의 300% 이상이 폭발하며 시가보다 종가가 낮은 장대음봉이 뜰 경우, 세력이 개미에게 물량을 넘겼다고 판단하여 즉시 익절.</li>
                <li><strong>🛑 하드 스탑 (최후 방어선 -5%):</strong> 매수 직후 예상과 달리 추세를 타지 못하거나 반등에 실패하여 -5%까지 떨어지면 미련 없이 기계적으로 손절 (리스크 관리).</li>
              </ul>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
