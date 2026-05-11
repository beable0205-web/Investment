import axios from 'axios';
import * as cheerio from 'cheerio';
import iconv from 'iconv-lite';
import fs from 'fs';
import path from 'path';

async function fetchMarketTickers(marketType: 'stockMkt' | 'kosdaqMkt', suffix: string) {
  const url = `http://kind.krx.co.kr/corpgeneral/corpList.do?method=download&searchType=13&marketType=${marketType}`;
  try {
    // KIND excel download actually returns EUC-KR encoded HTML
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const decodedHtml = iconv.decode(Buffer.from(response.data), 'EUC-KR');
    const $ = cheerio.load(decodedHtml);
    
    const tickers: { ticker: string; name: string }[] = [];
    
    $('table tbody tr').each((_, row) => {
      const columns = $(row).find('td');
      if (columns.length >= 3) {
        const name = $(columns[0]).text().trim();
        const code = $(columns[2]).text().trim();
        // Ensure code is 6 digits
        const paddedCode = code.padStart(6, '0');
        const ticker = `${paddedCode}${suffix}`;
        tickers.push({ ticker, name });
      }
    });
    
    return tickers;
  } catch (error) {
    console.error(`Failed to fetch ${marketType} tickers:`, error);
    return [];
  }
}

async function main() {
  console.log('한국 증시 (KOSPI, KOSDAQ) 티커를 가져옵니다...');
  
  const kospiTickers = await fetchMarketTickers('stockMkt', '.KS');
  console.log(`KOSPI 종목 수: ${kospiTickers.length}`);
  
  const kosdaqTickers = await fetchMarketTickers('kosdaqMkt', '.KQ');
  console.log(`KOSDAQ 종목 수: ${kosdaqTickers.length}`);
  
  const allTickers = [...kospiTickers, ...kosdaqTickers];
  console.log(`총 합계: ${allTickers.length} 종목`);
  
  const saveDir = path.join(process.cwd(), 'src', 'data');
  if (!fs.existsSync(saveDir)) {
    fs.mkdirSync(saveDir, { recursive: true });
  }
  
  const filePath = path.join(saveDir, 'kr_tickers.json');
  fs.writeFileSync(filePath, JSON.stringify(allTickers, null, 2), 'utf8');
  console.log(`✅ 성공적으로 ${filePath} 에 저장되었습니다.`);
}

if (require.main === module || process.argv[1].endsWith('fetch_kr_tickers.ts')) {
  main().catch(err => {
    console.error('실행 중 오류 발생:', err);
  });
}
