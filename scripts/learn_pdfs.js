const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config({ path: '.env.local' });

const PDF_DIR = path.join(process.cwd(), '기본적분석');
const OUTPUT_FILE = path.join(process.cwd(), 'src', 'data', 'archive', 'fundamental_rules.json');

async function processInChunks() {
  const files = fs.readdirSync(PDF_DIR).filter(file => file.endsWith('.pdf'));
  console.log(`Found ${files.length} PDF files.`);
  
  if (files.length === 0) return;

  let existingRules = [];
  if (fs.existsSync(OUTPUT_FILE)) {
    try {
      existingRules = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
    } catch (e) {
      existingRules = [];
    }
  }

  const CHUNK_SIZE = 10;
  let newlyLearnedRules = [];

  for (let i = 0; i < files.length; i += CHUNK_SIZE) {
    const chunkFiles = files.slice(i, i + CHUNK_SIZE);
    console.log(`\n--- 처리 중: ${i + 1} ~ ${i + chunkFiles.length} / ${files.length} ---`);
    
    let combinedText = '';
    for (const file of chunkFiles) {
      try {
        const dataBuffer = fs.readFileSync(path.join(PDF_DIR, file));
        const data = await pdf(dataBuffer);
        const text = data.text.substring(0, 50000); // PDF당 5만자 제한
        combinedText += `\n\n--- [Document: ${file}] ---\n\n${text}`;
      } catch (err) {
        console.error(`Error parsing ${file}:`, err);
      }
    }

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error('GEMINI_API_KEY is not defined');
      const ai = new GoogleGenAI({ apiKey });

      const prompt = `
다음은 '기본적 분석(재무회계, 산업분석, 기업선정, 비즈니스 모델, 밸류에이션 등)'에 관한 전문 투자 자료들에서 추출한 텍스트입니다.

[자료 내용 시작]
${combinedText.substring(0, 100000)} // 최대 길이 제한
[자료 내용 끝]

위 자료들에서 강조하는 **'실제 투자에 바로 적용할 수 있는 가장 핵심적이고 구체적인 5가지 분석 원칙(Rules)'**을 도출하십시오.
두루뭉술한 내용이 아니라, "매출채권 회전율이 이럴 때는 피하라" 등 구체적인 지침이어야 합니다.

아래 JSON 형식으로 응답하십시오 (반드시 순수 JSON):
[
  {
    "category": "재무회계 / 산업분석 / 비즈니스모델 / 밸류에이션 등 카테고리 명",
    "rule": "구체적이고 강력한 1문장 원칙",
    "details": "해당 원칙을 포트폴리오(ETF/주식) 분석에 적용할 때 확인해야 할 핵심 지표 (2~3문장)"
  }
]
`;
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        }
      });

      const resultJson = JSON.parse(response.text);
      if (Array.isArray(resultJson)) {
        console.log(`${resultJson.length}개의 새로운 기본적 분석 룰을 추출했습니다.`);
        newlyLearnedRules = newlyLearnedRules.concat(resultJson);
      }
    } catch (apiErr) {
      console.error('Gemini API Error in chunk:', apiErr.message || apiErr);
    }
  }

  // 중복 제거 후 저장 (간단히 rule 내용 기준)
  const allRules = [...existingRules, ...newlyLearnedRules];
  const uniqueRules = Array.from(new Map(allRules.map(r => [r.rule, r])).values());
  
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(uniqueRules, null, 2), 'utf-8');
  console.log(`\n✅ 기본적 분석 학습 완료! 총 ${newlyLearnedRules.length}개의 새로운 룰이 추가되어 총 ${uniqueRules.length}개의 룰이 저장되었습니다.`);
}

async function main() {
  try {
    await processInChunks();
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
