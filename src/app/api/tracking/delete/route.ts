import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const FILE_PATH = path.join(process.cwd(), 'src', 'data', 'archive', 'tracked_stocks.json');

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: '삭제할 ID가 제공되지 않았습니다.' }, { status: 400 });
    }

    if (!fs.existsSync(FILE_PATH)) {
      return NextResponse.json({ success: true }); // 이미 없으므로 성공 처리
    }

    const fileData = fs.readFileSync(FILE_PATH, 'utf-8');
    let stocks: any[] = JSON.parse(fileData);

    stocks = stocks.filter(s => s.id !== id);

    fs.writeFileSync(FILE_PATH, JSON.stringify(stocks, null, 2));

    return NextResponse.json({ success: true, message: '트래킹 목록에서 제거되었습니다.' });
  } catch (err: any) {
    console.error('Tracking Delete Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
