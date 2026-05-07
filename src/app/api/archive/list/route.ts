import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  if (!type || !['macro', 'company', 'ib'].includes(type)) {
    return NextResponse.json({ success: false, error: 'Invalid type parameter' }, { status: 400 });
  }

  let dirPath = '';
  if (type === 'macro') {
    dirPath = path.join(process.cwd(), 'src', 'data', 'archive', 'daily');
  } else if (type === 'company') {
    dirPath = path.join(process.cwd(), 'src', 'data', 'archive', 'company');
  } else if (type === 'ib') {
    dirPath = path.join(process.cwd(), 'src', 'data', 'archive', 'ib-news');
  }

  try {
    if (!fs.existsSync(dirPath)) {
      return NextResponse.json({ success: true, data: [] });
    }

    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json') && f !== 'usage.json');
    
    // Parse files to get basic metadata
    const list = files.map(file => {
      const parts = file.replace('.json', '').split('_');
      const date = parts[0];
      const ticker = parts[1] || null;
      return { file, date, ticker };
    });

    // Sort by date descending
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({ success: true, data: list });
  } catch (error: any) {
    console.error(`Archive List API Error (${type}):`, error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
