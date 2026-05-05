import { getRun } from 'workflow/api';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const runId = searchParams.get('runId');

  if (!runId) {
    return NextResponse.json({ error: 'runId is required' }, { status: 400 });
  }

  try {
    const run = getRun(runId);
    const status = await run.status;
    let output = null;
    
    if (status === 'completed') {
      output = await run.returnValue;
    }

    return NextResponse.json({
      status,
      output,
      error: null, // Error handling would happen via try-catch or status check
      runId: run.runId
    });
  } catch (error) {
    console.error('Workflow status error:', error);
    return NextResponse.json({ error: 'Failed to fetch workflow status' }, { status: 500 });
  }
}
