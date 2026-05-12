'use server';

import fs from 'fs';
import path from 'path';
import { revalidatePath } from 'next/cache';

export async function deletePosition(ticker: string) {
  const dbPath = path.join(process.cwd(), 'src', 'data', 'simulation', 'portfolio.json');
  if (!fs.existsSync(dbPath)) return;

  const p = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
  
  // Find position
  const posIndex = p.positions.findIndex((pos: any) => pos.ticker === ticker);
  if (posIndex > -1) {
    const pos = p.positions[posIndex];
    
    // Return cash to simulate selling/deleting at current value
    const currentVal = pos.quantity * (pos.currentPrice || pos.entryPrice);
    p.cash += currentVal;
    
    // Remove position
    p.positions.splice(posIndex, 1);
    
    // Recalculate total equity
    const positionsValue = p.positions.reduce((sum: number, pos: any) => sum + (pos.quantity * (pos.currentPrice || pos.entryPrice)), 0);
    p.totalEquity = p.cash + positionsValue;
    
    fs.writeFileSync(dbPath, JSON.stringify(p, null, 2));
    
    // Revalidate the page to update the UI
    revalidatePath('/simulation');
  }
}
