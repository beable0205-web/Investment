import { NextResponse } from 'next/server';
import { generatePodcastScript, synthesizeSpeech } from '@/lib/ai/podcast';
import { getMacroIndicators } from '@/lib/data/fred';
import { getETFData, getUSNews } from '@/lib/data/yahoo';
import { analyzeMacroData } from '@/lib/ai/gemini';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow more time for generation

export async function POST(req: Request) {
  try {
    // 1. Fetch data & analyze if not provided in the request
    // Alternatively, the client could pass the analysis explanation.
    // For automation (cron job), it's better to run the full pipeline here.
    const body = await req.json().catch(() => ({}));
    let explanation = body.explanation;

    if (!explanation) {
      const macroData = await getMacroIndicators();
      const etfData = await getETFData();
      const newsData = await getUSNews();
      const analysis = await analyzeMacroData(macroData, etfData, newsData);
      explanation = analysis.explanation;
    }

    // 2. Generate Podcast Script
    const script = await generatePodcastScript(explanation);

    // 3. Synthesize Speech for each line
    // A: Quant Analyst (Male: ko-KR-Wavenet-C), B: Historian (Female: ko-KR-Wavenet-A)
    const audioClips = [];
    for (const line of script) {
      const voiceName = line.speaker === 'A' ? 'ko-KR-Wavenet-C' : 'ko-KR-Wavenet-A';
      const audioBase64 = await synthesizeSpeech(line.text, voiceName);
      
      audioClips.push({
        speaker: line.speaker,
        text: line.text,
        audioBase64: audioBase64 // null if GOOGLE_TTS_API_KEY is missing
      });
    }

    // In a real production system, you'd merge these base64 audio clips into one MP3
    // or return them to the client to play sequentially.
    // For this prototype, we return the array.

    return NextResponse.json({
      success: true,
      data: {
        script: audioClips
      }
    });

  } catch (error: any) {
    console.error('Podcast API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
