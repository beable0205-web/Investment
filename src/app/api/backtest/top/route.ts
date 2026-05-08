import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'src', 'data', 'archive', 'top_backtested.json');
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ success: false, error: '글로벌 백테스트 데이터가 존재하지 않습니다. 백그라운드 스크립트 실행이 완료되었는지 확인해주세요.' }, { status: 404 });
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Top backtest 데이터 조회 실패:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
