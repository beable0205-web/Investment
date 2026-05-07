import { NextResponse } from 'next/server';
import { getLessons } from '@/lib/data/archive';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const lessons = getLessons();
    return NextResponse.json({
      success: true,
      data: lessons
    });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
