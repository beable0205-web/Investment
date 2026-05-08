import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const FILE_PATH = path.join(process.cwd(), 'src', 'data', 'archive', 'tracked_stocks.json');

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { ticker, name, discoveryPrice, matchReasons } = data;

    if (!ticker || !name || !discoveryPrice) {
      return NextResponse.json({ success: false, error: '필수 데이터가 누락되었습니다.' }, { status: 400 });
    }

    let stocks: any[] = [];
    if (fs.existsSync(FILE_PATH)) {
      const fileData = fs.readFileSync(FILE_PATH, 'utf-8');
      if (fileData) stocks = JSON.parse(fileData);
    } else {
      // Ensure directory exists
      const dir = path.dirname(FILE_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    }

    // 중복 체크
    const existingIndex = stocks.findIndex(s => s.ticker === ticker);
    const newStock = {
      id: Date.now().toString(),
      ticker,
      name,
      discoveryDate: new Date().toISOString(),
      discoveryPrice,
      matchReasons: matchReasons || []
    };

    if (existingIndex > -1) {
      // 이미 트래킹 중이면 발굴가 등을 최신으로 갱신
      stocks[existingIndex] = { ...stocks[existingIndex], ...newStock, id: stocks[existingIndex].id };
    } else {
      stocks.push(newStock);
    }

    fs.writeFileSync(FILE_PATH, JSON.stringify(stocks, null, 2));

    return NextResponse.json({ success: true, message: '트래킹 포트폴리오에 추가되었습니다.', data: newStock });
  } catch (err: any) {
    console.error('Tracking Add Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
