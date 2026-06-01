import { start } from 'workflow/api';
import { dailyAutoPostWorkflow } from '@/lib/workflows/blog-gen';
import { getSettings } from '@/lib/db';
import { NextResponse } from 'next/server';

export const maxDuration = 60; // Max allowed for Vercel Hobby plan

export async function GET(req: Request) {
  try {
    // 1. Basic security check for Vercel Cron
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get API keys — use env vars first (fast), fallback to Firestore settings
    let apiKey: string | undefined = undefined;
    let openaiApiKey: string | undefined = undefined;

    // If GROQ_API_KEY is in env, blog-gen.ts will use it automatically.
    // Only fetch Firestore settings if we need Gemini/OpenAI keys.
    const hasGroqKey = !!process.env.GROQ_API_KEY;

    if (!hasGroqKey) {
      // Slow path: fetch from Firestore only if no env-based key available
      const settings = await getSettings();
      apiKey = settings.geminiApiKey;
      openaiApiKey = settings.openaiApiKey;

      if (!apiKey && !openaiApiKey) {
        return NextResponse.json({ 
          error: 'No AI API Key found. Add GROQ_API_KEY to Vercel env or set Gemini/OpenAI key in Admin Settings.' 
        }, { status: 500 });
      }
    }

    // 3. Trigger the workflow (runs in background, returns runId immediately)
    const run = await start(dailyAutoPostWorkflow, [{ apiKey, openaiApiKey }]);

    console.log(`[CRON] Daily blog workflow started. RunID: ${run.runId}. Provider: ${hasGroqKey ? 'GROQ' : 'Gemini/OpenAI'}`);

    return NextResponse.json({ 
      success: true, 
      message: 'Daily auto-post workflow started',
      provider: hasGroqKey ? 'groq' : 'gemini/openai',
      runId: run.runId 
    });
  } catch (error: any) {
    console.error('Daily Cron Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

