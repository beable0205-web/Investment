import fs from 'fs';
import path from 'path';

const ARCHIVE_DIR = path.join(process.cwd(), 'src', 'data', 'archive', 'daily');
const LESSONS_FILE = path.join(process.cwd(), 'src', 'data', 'archive', 'lessons.json');

// 아카이브 폴더가 없으면 생성
if (!fs.existsSync(ARCHIVE_DIR)) {
  fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
}
if (!fs.existsSync(path.dirname(LESSONS_FILE))) {
  fs.mkdirSync(path.dirname(LESSONS_FILE), { recursive: true });
}

export interface DailyArchive {
  date: string;
  analysis: any; // explanation, tailored_news, recommended_papers, etc.
}

export function saveDailyArchive(analysis: any) {
  if (!analysis) return;
  
  const today = new Date();
  const dateString = today.toISOString().split('T')[0]; // YYYY-MM-DD
  const filePath = path.join(ARCHIVE_DIR, `${dateString}.json`);

  const archiveData: DailyArchive = {
    date: dateString,
    analysis: analysis
  };

  fs.writeFileSync(filePath, JSON.stringify(archiveData, null, 2), 'utf-8');
}

export function getDailyArchives(): DailyArchive[] {
  try {
    const files = fs.readdirSync(ARCHIVE_DIR).filter(file => file.endsWith('.json'));
    const archives: DailyArchive[] = [];

    for (const file of files) {
      const filePath = path.join(ARCHIVE_DIR, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      try {
        const parsed = JSON.parse(content);
        archives.push(parsed);
      } catch (e) {
        console.error(`Failed to parse archive file: ${file}`);
      }
    }

    // 최신 날짜 순 정렬
    return archives.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (err) {
    console.error('Error reading daily archives', err);
    return [];
  }
}

export interface AILesson {
  date: string;
  reflection: string; // 왜 틀렸는지/맞았는지에 대한 성찰
  principle: string; // 다음 분석에 적용할 교훈/원칙
}

export function saveLesson(lesson: AILesson) {
  const lessons = getLessons();
  lessons.unshift(lesson); // 최신 교훈을 앞에 추가
  fs.writeFileSync(LESSONS_FILE, JSON.stringify(lessons, null, 2), 'utf-8');
}

export function getLessons(): AILesson[] {
  try {
    if (!fs.existsSync(LESSONS_FILE)) return [];
    const content = fs.readFileSync(LESSONS_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.error('Error reading lessons', err);
    return [];
  }
}

// =====================================
// 회사 심층 분석(Company) 아카이브 및 횟수 제한
// =====================================
const COMPANY_ARCHIVE_DIR = path.join(process.cwd(), 'src', 'data', 'archive', 'company');
const USAGE_FILE = path.join(process.cwd(), 'src', 'data', 'archive', 'usage.json');

if (!fs.existsSync(COMPANY_ARCHIVE_DIR)) {
  fs.mkdirSync(COMPANY_ARCHIVE_DIR, { recursive: true });
}

export function checkCompanyUsageLimit(): boolean {
  const today = new Date().toISOString().split('T')[0];
  try {
    let usageData: any = {};
    if (fs.existsSync(USAGE_FILE)) {
      usageData = JSON.parse(fs.readFileSync(USAGE_FILE, 'utf-8'));
    }

    if (usageData.date !== today) {
      usageData = { date: today, count: 0 };
    }

    if (usageData.count >= 5) {
      return false; // Limit reached
    }

    // Increment and save
    usageData.count += 1;
    fs.writeFileSync(USAGE_FILE, JSON.stringify(usageData, null, 2), 'utf-8');
    return true;
  } catch (e) {
    console.error('Error checking usage limit:', e);
    return false; // Safely fail
  }
}

export function saveCompanyArchive(ticker: string, analysis: any) {
  if (!analysis) return;
  const today = new Date().toISOString().split('T')[0];
  const safeTicker = ticker.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const filePath = path.join(COMPANY_ARCHIVE_DIR, `${today}_${safeTicker}.json`);
  
  fs.writeFileSync(filePath, JSON.stringify(analysis, null, 2), 'utf-8');
}

