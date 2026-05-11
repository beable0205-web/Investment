"use server";

import fs from 'fs';
import path from 'path';
import { getStockData } from '@/lib/screener';
import { getNaverCompanyData } from '@/lib/data/naver_finance';
import { revalidatePath } from 'next/cache';

const getDbPath = () => path.join(process.cwd(), 'src', 'data', 'kr_tracked_stocks.json');

export async function manualSell(ticker: string) {
  const dbPath = getDbPath();
  if (!fs.existsSync(dbPath)) return { success: false, message: 'DB 파일을 찾을 수 없습니다.' };

  const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  
  const stockIndex = db.stocks.findIndex((s: any) => s.ticker === ticker && s.status === 'TRACKING');
  if (stockIndex === -1) return { success: false, message: '추적 중인 종목을 찾을 수 없습니다.' };

  const stock = db.stocks[stockIndex];
  
  // 현재가 가져오기
  const histData = await getStockData(ticker, 5);
  if (!histData || histData.length === 0) return { success: false, message: '현재가 데이터를 불러오지 못했습니다.' };
  
  const currentPrice = histData[histData.length - 1].close;
  const entryPrice = stock.entryPrice;
  const roi = ((currentPrice - entryPrice) / entryPrice) * 100;
  
  const sellAmount = stock.shares * currentPrice;
  const profit = sellAmount - (stock.investedAmount || 0);

  // 계좌 현금 환입 및 수익금 기록
  if (db.account) {
    db.account.cash += sellAmount;
    db.account.totalRealizedProfit += profit;
  }

  // 상태 업데이트
  stock.status = 'SOLD';
  stock.sellPrice = currentPrice;
  stock.sellDate = new Date().toISOString();
  stock.realizedROI = roi;

  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
  
  try {
    revalidatePath('/kr-portfolio');
  } catch (e) {
    // Ignore error if called outside Next.js context
  }
  
  return { success: true, message: `${stock.companyName} 전량 매도 완료 (매도대금: ${sellAmount.toLocaleString()}원)` };
}

export async function manualBuy(ticker: string) {
  const dbPath = getDbPath();
  if (!fs.existsSync(dbPath)) return { success: false, message: 'DB 파일을 찾을 수 없습니다.' };

  // 종목 코드 정리
  let cleanTicker = ticker.trim().replace(/\.KS|\.KQ/gi, '');
  if (!/^\d{6}$/.test(cleanTicker)) {
    return { success: false, message: '올바른 6자리 종목 코드를 입력해주세요.' };
  }
  
  // 야후 파이낸스는 .KS를 주로 쓰지만, 한국 종목 검색을 위해 .KS를 붙여서 시도 후 실패시 .KQ
  let histData = await getStockData(`${cleanTicker}.KS`, 5);
  let finalTicker = `${cleanTicker}.KS`;
  
  if (!histData || histData.length === 0) {
    histData = await getStockData(`${cleanTicker}.KQ`, 5);
    finalTicker = `${cleanTicker}.KQ`;
  }
  
  if (!histData || histData.length === 0) {
    return { success: false, message: '종목 데이터를 불러오지 못했습니다. 코드를 확인해주세요.' };
  }

  const currentPrice = histData[histData.length - 1].close;
  
  // 네이버 데이터로 회사명 등 가져오기
  const companyData = await getNaverCompanyData(finalTicker);
  if (!companyData) {
    return { success: false, message: '네이버 금융에서 기업 정보를 찾을 수 없습니다.' };
  }

  const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  
  const currentTrackingCount = db.stocks.filter((s: any) => s.status === 'TRACKING').length;
  if (currentTrackingCount >= 10) {
    return { success: false, message: '최대 보유 종목 수(10개)에 도달했습니다.' };
  }

  const alreadyExists = db.stocks.find((s: any) => s.ticker === finalTicker && s.status === 'TRACKING');
  if (alreadyExists) {
    return { success: false, message: '이미 포트폴리오에 존재하는 종목입니다.' };
  }

  let cash = db.account?.cash || 0;
  if (cash < 1000000) {
    return { success: false, message: `보유 현금이 부족합니다. (현재 잔고: ${cash.toLocaleString()}원)` };
  }

  const maxInvestment = 100000000;
  const targetInvestAmount = Math.min(cash, maxInvestment);
  const shares = Math.floor(targetInvestAmount / currentPrice);
  const actualInvested = shares * currentPrice;

  if (shares <= 0) {
    return { success: false, message: '1주를 살 현금조차 부족합니다.' };
  }

  if (db.account) {
    db.account.cash -= actualInvested;
  }

  const newStock = {
    id: `${finalTicker}-${Date.now()}`,
    ticker: finalTicker,
    companyName: companyData.description ? companyData.description.split(' ')[0] || companyData.ticker : finalTicker, 
    addedDate: new Date().toISOString(),
    entryPrice: currentPrice,
    currentPrice: currentPrice,
    shares: shares,
    investedAmount: actualInvested,
    unrealizedROI: 0,
    status: 'TRACKING',
    matchReasons: ['수동 매수 (쩐주 직접 지시)'],
    targetPrice: Math.round(currentPrice * 1.5),
    stopLossPrice: Math.round(currentPrice * 0.90)
  };
  
  db.stocks.push(newStock);
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

  try {
    revalidatePath('/kr-portfolio');
  } catch (e) {
    // Ignore error if called outside Next.js context
  }

  return { success: true, message: `${newStock.companyName} ${shares}주 편입 완료 (총 ${actualInvested.toLocaleString()}원 매수)` };
}
