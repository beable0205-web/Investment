import { NextResponse } from 'next/server';
import { getDailyArchives } from '@/lib/data/archive';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const archives = getDailyArchives();
    return NextResponse.json({
      success: true,
      data: archives
    });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
