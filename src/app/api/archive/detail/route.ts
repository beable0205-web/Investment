import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const file = searchParams.get('file');

  if (!type || !['macro', 'company', 'ib'].includes(type) || !file) {
    return NextResponse.json({ success: false, error: 'Invalid parameters' }, { status: 400 });
  }

  let dirPath = '';
  if (type === 'macro') {
    dirPath = path.join(process.cwd(), 'src', 'data', 'archive', 'daily');
  } else if (type === 'company') {
    dirPath = path.join(process.cwd(), 'src', 'data', 'archive', 'company');
  } else if (type === 'ib') {
    dirPath = path.join(process.cwd(), 'src', 'data', 'archive', 'ib-news');
  }

  const filePath = path.join(dirPath, file);

  try {
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ success: false, error: 'File not found' }, { status: 404 });
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(content);

    return NextResponse.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error(`Archive Detail API Error (${file}):`, error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
