import { GoogleGenAI } from '@google/genai';

export async function generatePodcastScript(reportText: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is missing');

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
당신은 최고의 라디오 팟캐스트 PD이자 작가입니다.
아래의 [AI 매크로 투자 리포트]를 바탕으로, 두 명의 전문가가 대화하는 팟캐스트 스크립트를 작성해주세요.

[페르소나 설정]
- A (가치투자 기반의 리스크 관리자, 남성 목소리 가정): 하워드 막스의 '2차적 사고'를 바탕으로 시장의 사이클과 군중 심리, 하방 리스크를 냉철하게 경고하는 역할.
- B (탑다운 매크로 트렌드 추종자, 여성 목소리 가정): 스탠리 드러켄밀러처럼 유동성의 거대한 흐름과 역사적 트렌드를 포착하여 과감한 베팅(Conviction) 기회를 제시하는 역할.

[AI 매크로 투자 리포트]
${reportText}

[요청 사항]
- 대화는 자연스럽고 흥미로워야 하며, 서로 티키타카가 잘 맞아야 합니다.
- 스크립트 길이는 실제 말할 때 약 2-3분 분량으로 작성하세요.
- 출력 형식은 반드시 순수 JSON 배열만 반환하세요. (Markdown 백틱 금지)

예시 포맷:
[
  { "speaker": "A", "text": "안녕하세요, 오늘 시장 데이터는 흥미로운 패턴을 보여주고 있습니다." },
  { "speaker": "B", "text": "맞아요. 역사적으로 볼 때 1970년대의 인플레이션 수축기와 꽤나 닮아있죠." }
]
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    throw new Error('No script generated');
  } catch (error) {
    console.error('Failed to generate podcast script:', error);
    throw error;
  }
}

export async function synthesizeSpeech(text: string, voiceName: string) {
  const ttsKey = process.env.GOOGLE_TTS_API_KEY;
  if (!ttsKey) {
    console.warn('GOOGLE_TTS_API_KEY is not defined. Skipping actual audio generation.');
    return null;
  }

  const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${ttsKey}`;
  
  const payload = {
    input: { text },
    voice: { languageCode: 'ko-KR', name: voiceName },
    audioConfig: { audioEncoding: 'MP3' }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`TTS API error: ${errorText}`);
    }

    const data = await response.json();
    return data.audioContent; // Base64 encoded MP3
  } catch (error) {
    console.error('Failed to synthesize speech:', error);
    throw error;
  }
}
