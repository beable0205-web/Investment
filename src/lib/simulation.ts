import fs from 'fs';
import path from 'path';

export interface Position {
  ticker: string;
  companyName: string;
  entryDate: string;
  entryPrice: number;
  quantity: number;
  rule: string;
  currentPrice?: number;
  roi?: number;
  highestPrice?: number;
  inTrailing?: boolean;
}

export interface TradeHistory {
  ticker: string;
  entryDate: string;
  entryPrice: number;
  exitDate: string;
  exitPrice: number;
  quantity: number;
  roi: number;
  profit: number;
  reason: string;
}

export interface Portfolio {
  cash: number;
  totalEquity: number;
  positions: Position[];
  history: TradeHistory[];
  equityCurve: { date: string; equity: number }[];
}

const DATA_DIR = path.join(process.cwd(), 'src', 'data', 'simulation');
const DB_PATH = path.join(DATA_DIR, 'portfolio.json');

export function initPortfolio(initialCash = 500000): Portfolio {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_PATH)) {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  }

  const p: Portfolio = {
    cash: initialCash,
    totalEquity: initialCash,
    positions: [],
    history: [],
    equityCurve: [{ date: new Date().toISOString().split('T')[0], equity: initialCash }]
  };
  savePortfolio(p);
  return p;
}

export function savePortfolio(p: Portfolio) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(p, null, 2));
}

// 매수 실행
export function executeBuy(p: Portfolio, ticker: string, companyName: string, price: number, rule: string, date: string, targetInvestAmount?: number) {
  // 포트당 최대 편입 한도 $100,000
  const maxAllocation = 100000;
  if (p.positions.find(pos => pos.ticker === ticker)) return false; // 이미 보유 중

  let requestedAmount = targetInvestAmount !== undefined ? targetInvestAmount : maxAllocation;
  // 최대 한도 $100,000 제한
  requestedAmount = Math.min(requestedAmount, maxAllocation);
  
  let investAmount = Math.min(p.cash, requestedAmount);
  
  if (investAmount < price) return false; // 돈 부족

  const quantity = Math.floor(investAmount / price);
  const totalCost = quantity * price;

  p.cash -= totalCost;
  p.positions.push({
    ticker,
    companyName,
    entryDate: date,
    entryPrice: price,
    quantity,
    rule,
    currentPrice: price,
    roi: 0
  });

  return true;
}

// 매도 실행
export function executeSell(p: Portfolio, ticker: string, price: number, date: string, reason: string) {
  const idx = p.positions.findIndex(pos => pos.ticker === ticker);
  if (idx === -1) return false;

  const pos = p.positions[idx];
  const totalValue = pos.quantity * price;
  const profit = totalValue - (pos.quantity * pos.entryPrice);
  const roi = (price - pos.entryPrice) / pos.entryPrice * 100;

  p.cash += totalValue;
  
  p.history.push({
    ticker: pos.ticker,
    entryDate: pos.entryDate,
    entryPrice: pos.entryPrice,
    exitDate: date,
    exitPrice: price,
    quantity: pos.quantity,
    roi,
    profit,
    reason
  });

  p.positions.splice(idx, 1);
  return true;
}

// 매일 자산 재평가 및 자동 매매 체결
export function dailySettlement(currentDate: string, currentPrices: Record<string, number>) {
  const p = initPortfolio();
  let totalPositionValue = 0;

  // 1. 보유 종목 평가 및 익절/손절 확인
  for (let i = p.positions.length - 1; i >= 0; i--) {
    const pos = p.positions[i];
    const currentPrice = currentPrices[pos.ticker];
    if (!currentPrice) {
      totalPositionValue += (pos.currentPrice || pos.entryPrice) * pos.quantity;
      continue;
    }

    pos.currentPrice = currentPrice;
    pos.roi = (currentPrice - pos.entryPrice) / pos.entryPrice * 100;

    // 보유 기간 계산 (일)
    const holdingDays = (new Date(currentDate).getTime() - new Date(pos.entryDate).getTime()) / (1000 * 60 * 60 * 24);

    pos.highestPrice = Math.max(pos.highestPrice || pos.entryPrice, currentPrice);

    // Rule 1: 기계적 하드 스탑 (-15%)
    if (pos.roi <= -15) {
      executeSell(p, pos.ticker, currentPrice, currentDate, "🛑 기계적 손절 (-15% 하드스탑)");
    }
    // Rule 2: 트레일링 스탑 활성화 및 익절
    // 50% 도달 시 트레일링 스탑 활성화
    else if (pos.roi >= 50 && !pos.inTrailing) {
      pos.inTrailing = true;
      console.log(`🚀 [${pos.ticker}] 50% 수익 돌파! 트레일링 스탑 활성화 (수익 극대화 구간 진입)`);
      totalPositionValue += currentPrice * pos.quantity;
    }
    // 트레일링 스탑 작동 중 고점 대비 20% 하락 시 추세 꺾임으로 간주하고 익절
    else if (pos.inTrailing && currentPrice < (pos.highestPrice * 0.80)) {
      executeSell(p, pos.ticker, currentPrice, currentDate, `🎯 추세 종료 익절 (최고점 대비 -20% 하락, 트레일링 스탑)`);
    }
    // Rule 3: 타임 스탑 (90일 초과, 수익률 -5% ~ +5% 횡보)
    else if (holdingDays > 90 && pos.roi >= -5 && pos.roi <= 5 && !pos.inTrailing) {
      executeSell(p, pos.ticker, currentPrice, currentDate, "⏳ 기회비용 방어 (90일 횡보 타임스탑 매도)");
    } 
    else {
      totalPositionValue += currentPrice * pos.quantity;
    }
  }

  p.totalEquity = p.cash + totalPositionValue;
  
  // 오늘 날짜로 에퀴티 커브 업데이트
  const lastCurve = p.equityCurve[p.equityCurve.length - 1];
  if (lastCurve && lastCurve.date === currentDate) {
    lastCurve.equity = p.totalEquity;
  } else {
    p.equityCurve.push({ date: currentDate, equity: p.totalEquity });
  }

  savePortfolio(p);
  return p;
}
