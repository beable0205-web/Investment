import { NextResponse } from 'next/server';
import { initPortfolio } from '@/lib/simulation';

export async function GET() {
  try {
    const portfolio = initPortfolio();
    return NextResponse.json(portfolio);
  } catch (error: any) {
    console.error('Failed to load portfolio:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
