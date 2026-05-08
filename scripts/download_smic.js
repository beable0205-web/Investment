import fs from 'fs';
import path from 'path';
import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';

const BASE_URL = 'http://snusmic.com/research/page/';
const OUTPUT_DIR = path.join(process.cwd(), '기본적분석');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// https 인가 에러 방지
const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const ax = axios.create({ httpsAgent });

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 특정 파일명에서 허용되지 않는 문자 제거
function sanitizeFileName(name) {
  return name.replace(/[<>:"\/\\|?*]+/g, '_').trim();
}

async function downloadPDF(url, filepath) {
  try {
    const response = await ax({
      method: 'GET',
      url: url,
      responseType: 'stream',
    });

    return new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(filepath);
      response.data.pipe(writer);
      let error = null;
      writer.on('error', err => {
        error = err;
        writer.close();
        reject(err);
      });
      writer.on('close', () => {
        if (!error) resolve(true);
      });
    });
  } catch (error) {
    console.error(`Error downloading ${url}:`, error.message);
    return false;
  }
}

async function startScraping() {
  console.log('--- SMIC Research PDF Crawler Started ---');
  let totalDownloaded = 0;

  for (let page = 1; page <= 51; page++) {
    const pageUrl = page === 1 ? 'http://snusmic.com/research/' : `${BASE_URL}${page}/`;
    console.log(`\nFetching Page ${page}: ${pageUrl}`);
    
    try {
      const { data } = await ax.get(pageUrl);
      const $ = cheerio.load(data);
      
      const articleLinks = [];
      // h3 안에 a 태그로 링크가 있음
      $('h3 a').each((i, el) => {
        const href = $(el).attr('href');
        const title = $(el).text().trim();
        if (href && href.includes('equity-research')) {
          articleLinks.push({ title, href });
        }
      });

      console.log(`Found ${articleLinks.length} articles on page ${page}`);

      for (const article of articleLinks) {
        console.log(` -> Processing: ${article.title}`);
        try {
          const { data: detailData } = await ax.get(article.href);
          const $detail = cheerio.load(detailData);
          
          let pdfUrl = null;
          // 'download' 라는 텍스트를 가진 a 링크를 찾거나, href가 .pdf로 끝나는 것을 찾음
          $detail('a').each((i, el) => {
            const href = $detail(el).attr('href');
            if (href && href.toLowerCase().endsWith('.pdf')) {
              pdfUrl = href;
            }
          });

          if (!pdfUrl) {
            console.log(`    [SKIP] No PDF link found for ${article.title}`);
            continue;
          }

          const safeTitle = sanitizeFileName(article.title);
          const filePath = path.join(OUTPUT_DIR, `${safeTitle}.pdf`);

          if (fs.existsSync(filePath)) {
            console.log(`    [EXISTS] ${safeTitle}.pdf already downloaded`);
            continue;
          }

          console.log(`    [DOWNLOADING] ${pdfUrl}`);
          const success = await downloadPDF(pdfUrl, filePath);
          
          if (success) {
            console.log(`    [SUCCESS] Saved to ${filePath}`);
            totalDownloaded++;
          }
          
          // Rate Limiting (2 seconds delay between downloads)
          await delay(2000);
        } catch (detailErr) {
          console.error(`    [ERROR] fetching detail page ${article.href}:`, detailErr.message);
        }
      }
      
      // Delay between pages
      await delay(3000);
    } catch (pageErr) {
      console.error(`Error fetching page ${page}:`, pageErr.message);
    }
  }

  console.log(`\n--- Crawling Finished. Total Downloaded: ${totalDownloaded} ---`);
}

startScraping();
