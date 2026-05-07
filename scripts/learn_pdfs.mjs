import fs from 'fs';
import path from 'path';
import pdf from 'pdf-parse/lib/pdf-parse.js';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const PDF_DIR = path.join(process.cwd(), '기본적분석');
const OUTPUT_FILE = path.join(process.cwd(), 'src', 'data', 'archive', 'fundamental_rules.json');

async function extractTextFromPDFs() {
  const files = fs.readdirSync(PDF_DIR).filter(file => file.endsWith('.pdf'));
  console.log(`Found ${files.length} PDF files.`);
  
  let combinedText = '';
  
  for (const file of files) {
    console.log(`Parsing ${file}...`);
    const dataBuffer = fs.readFileSync(path.join(PDF_DIR, file));
    try {
      const data = await pdf(dataBuffer);
      // To prevent tokens from exploding, take the first 3000 characters of each PDF (usually contains the core summary/index)
      // or we can take the whole text if the model supports 1M tokens (Gemini 2.5 Flash does!).
      // We will take up to 20,000 chars per file to be safe and ensure the prompt isn't insanely huge, 
      // but Gemini 2.5 flash supports 1M tokens, so let's take up to 50,000 characters per file.
      const text = data.text.substring(0, 50000); 
      combinedText += `\n\n--- [Document: ${file}] ---\n\n${text}`;
    } catch (err) {
      console.error(`Error parsing ${file}:`, err);
    }
  }
  
  return combinedText;
}

async function generateFundamentalRules(text) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not defined');

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
다음은 '기본적 분석(재무회계, 산업분석, 기업선정, 비즈니스 모델, 밸류에이션 등)'에 관한 전문 투자 자료들에서 추출한 텍스트입니다.

[자료 내용 시작]
${text}
[자료 내용 끝]

당신은 이제 이 자료의 내용을 당신의 뇌 구조로 완벽히 흡수해야 합니다.
위 자료들에서 강조하는 **'실제 투자에 바로 적용할 수 있는 가장 핵심적이고 구체적인 10가지 분석 원칙(Rules)'**을 도출하십시오.
두루뭉술한 내용이 아니라, "매출채권 회전율이 이럴 때는 피하라", "비즈니스 모델을 분석할 땐 이런 해자를 봐라" 등 매우 날카롭고 구체적인 지침이어야 합니다.

아래 JSON 형식으로 응답하십시오:
[
  {
    "category": "재무회계 / 산업분석 / 비즈니스모델 / 밸류에이션 등 카테고리 명",
    "rule": "구체적이고 강력한 1문장 원칙",
    "details": "해당 원칙을 포트폴리오(ETF/주식) 분석에 적용할 때 확인해야 할 핵심 지표 및 2차적 사고 관점 (3~4문장)"
  }
]
`;

  console.log('Sending text to Gemini to extract core fundamental rules...');
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      temperature: 0.2,
    }
  });

  const responseText = response.text;
  if (!responseText) throw new Error('Empty response');
  
  return JSON.parse(responseText);
}

async function main() {
  try {
    const text = await extractTextFromPDFs();
    console.log(`Extracted total ${text.length} characters.`);
    
    const rules = await generateFundamentalRules(text);
    
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(rules, null, 2), 'utf-8');
    console.log(`✅ Successfully saved fundamental rules to ${OUTPUT_FILE}`);
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
