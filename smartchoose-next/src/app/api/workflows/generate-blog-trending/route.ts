import { start } from 'workflow/api';
import { dailyAutoPostWorkflow } from '@/lib/workflows/blog-gen';
import { getSettings } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    // This is for manual admin trigger, so no CRON_SECRET needed 
    // (Assuming middleware or other auth protects /api/workflows/*)
    
    const settings = await getSettings();
    const apiKey = settings.geminiApiKey;

    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API Key not found' }, { status: 500 });
    }

    const run = await start(dailyAutoPostWorkflow, [{ apiKey }]);

    return NextResponse.json({ 
      success: true, 
      runId: run.runId 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
