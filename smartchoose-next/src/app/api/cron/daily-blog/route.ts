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

    // 2. Get API key from Firestore
    const settings = await getSettings();
    const apiKey = settings.geminiApiKey;
    const openaiApiKey = settings.openaiApiKey;

    if (!apiKey && !openaiApiKey) {
      return NextResponse.json({ error: 'No AI API Key (Gemini or OpenAI) found in settings' }, { status: 500 });
    }

    // 3. Trigger the workflow
    const run = await start(dailyAutoPostWorkflow, [{ apiKey, openaiApiKey }]);


    return NextResponse.json({ 
      success: true, 
      message: 'Daily auto-post workflow started',
      runId: run.runId 
    });
  } catch (error: any) {
    console.error('Daily Cron Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
