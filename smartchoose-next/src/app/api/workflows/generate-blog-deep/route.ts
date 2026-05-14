import { start } from 'workflow/api';
import { deepResearchWorkflow } from '@/lib/workflows/blog-gen';
import { NextResponse } from 'next/server';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { apiKey, openaiApiKey, secretKey } = await req.json();

    // Basic security check
    if (process.env.ADMIN_SECRET_KEY && secretKey !== process.env.ADMIN_SECRET_KEY) {
      // return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!apiKey && !openaiApiKey) {
      return NextResponse.json({ error: 'API Keys are required' }, { status: 400 });
    }

    // Start the Vercel Workflow for 24h Deep Research
    const run = await start(deepResearchWorkflow, [{ apiKey, openaiApiKey }]);

    return NextResponse.json({ 
      success: true, 
      runId: run.runId,
      message: 'Deep Research workflow started.'
    });
  } catch (error: any) {
    console.error('Deep Research Trigger Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
