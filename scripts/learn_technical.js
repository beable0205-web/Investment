import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const INPUT_DIR = path.join(process.cwd(), '기술적분석');
const OUTPUT_FILE = path.join(process.cwd(), 'src', 'data', 'archive', 'technical_rules.json');

// vtt 파일에서 시간 태그와 불필요한 공백 제거
function cleanVtt(content) {
  return content
    .split('\n')
    .filter(line => !line.includes('-->') && !line.startsWith('WEBVTT') && line.trim() !== '')
    .join(' ')
    .replace(/<[^>]*>/g, '') // HTML/VTT 태그 제거
    .replace(/\s+/g, ' ');   // 중복 공백 제거
}

async function startLearning() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY is missing in .env.local');
    return;
  }

  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey });

  if (!fs.existsSync(INPUT_DIR)) {
    console.error(`디렉토리를 찾을 수 없습니다: ${INPUT_DIR}`);
    return;
  }

  const files = fs.readdirSync(INPUT_DIR).filter(f => f.endsWith('.vtt'));
  if (files.length === 0) {
    console.log('학습할 자막(.vtt) 파일이 없습니다.');
    return;
  }

  console.log(`총 ${files.length}개의 자막 파일을 학습합니다...`);

  // 기존 룰 로드
  let existingRules = [];
  if (fs.existsSync(OUTPUT_FILE)) {
    try {
      existingRules = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
    } catch (e) {
      existingRules = [];
    }
  }

  // 너무 많으면 토큰 초과가 발생하므로, 청크 단위(예: 5개 파일)로 묶어서 처리
  const CHUNK_SIZE = 5;
  let newlyLearnedRules = [];

  for (let i = 0; i < files.length; i += CHUNK_SIZE) {
    const chunkFiles = files.slice(i, i + CHUNK_SIZE);
    console.log(`\n--- 처리 중: ${i + 1} ~ ${i + chunkFiles.length} / ${files.length} ---`);
    
    let combinedText = '';
    for (const file of chunkFiles) {
      const content = fs.readFileSync(path.join(INPUT_DIR, file), 'utf-8');
      combinedText += `\n[${file}]\n${cleanVtt(content)}\n`;
    }

    const prompt = `
다음은 주식 전문가(주식단테)의 유튜브 강의 대본(자막) 원문입니다.
이 대본을 분석하여, 차트 분석, 매매 기법, 지지/저항 설정, 이평선 활용, 거래량 분석 등 명확하고 구체적인 **기술적 분석 노하우(Rule)** 만을 추출해 주세요.

<조건>
1. 일상 대화, 종목 추천, 잡담은 완전히 배제하십시오.
2. 분석 기법이 구체적으로 설명된 부분만 추출하십시오 (예: "112일선이 224일선을 돌파할 때 매수", "볼린저밴드 하단 이탈 시 대응" 등).
3. JSON 형식의 배열로만 응답하십시오.

<JSON 스키마>
[
  {
    "category": "분류 (예: 이평선, 거래량, 패턴, 볼린저밴드 등)",
    "rule": "추출한 핵심 매매 규칙 및 분석 노하우 요약 문장"
  }
]

<대본 원문>
${combinedText.substring(0, 30000)} // 최대 길이 제한
`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        }
      });
      
      const resultJson = JSON.parse(response.text);
      if (Array.isArray(resultJson)) {
        console.log(`${resultJson.length}개의 새로운 규칙을 추출했습니다.`);
        newlyLearnedRules = newlyLearnedRules.concat(resultJson);
      }
    } catch (err) {
      console.error(`청크 ${i} 처리 중 에러 발생:`, err.message);
    }
    
    // API rate limit 방지용 딜레이
    await new Promise(r => setTimeout(r, 2000));
  }

  // 중복 룰 제거 및 병합 로직 (간단히 title/rule 기준)
  const allRules = [...existingRules, ...newlyLearnedRules];
  const uniqueRulesMap = new Map();
  allRules.forEach(r => uniqueRulesMap.set(r.rule, r));
  const finalRules = Array.from(uniqueRulesMap.values());

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(finalRules, null, 2), 'utf-8');
  console.log(`\n✅ 학습 완료! 총 ${newlyLearnedRules.length}개의 규칙이 새롭게 추가되어, 현재 총 ${finalRules.length}개의 기술적 룰이 시스템에 저장되었습니다.`);
  console.log(`저장 위치: ${OUTPUT_FILE}`);
}

startLearning();
