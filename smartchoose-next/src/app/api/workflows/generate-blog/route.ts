import { start } from 'workflow/api';
import { blogGenerationWorkflow } from '@/lib/workflows/blog-gen';
import { NextResponse } from 'next/server';

export const maxDuration = 60; // Max allowed for Vercel Hobby plan

export async function POST(req: Request) {
  try {
    const { title, style, apiKey, secretKey } = await req.json();

    // Basic security check (optional, but recommended)
    if (process.env.ADMIN_SECRET_KEY && secretKey !== process.env.ADMIN_SECRET_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!title || !apiKey) {
      return NextResponse.json({ error: 'Title and API Key are required' }, { status: 400 });
    }

    // Start the Vercel Workflow
    const run = await start(blogGenerationWorkflow, [{ title, style, apiKey }]);

    return NextResponse.json({ 
      success: true, 
      runId: run.runId,
      message: 'Blog generation workflow started successfully.'
    });
  } catch (error: any) {
    console.error('Workflow Trigger Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
