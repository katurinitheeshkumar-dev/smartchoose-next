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
    let error = null;
    
    if (status?.toUpperCase() === 'COMPLETED') {
      output = await run.returnValue;
    } else if (status?.toUpperCase() === 'FAILED') {
      // Retrieve the error from the run. In many workflow libraries, 
      // the error is available via run.error or by awaiting run.returnValue which might throw.
      try {
        // Awaiting the return value of a failed run usually throws the error
        await run.returnValue;
      } catch (e: any) {
        error = e.message || 'Unknown workflow error';
      }

    }

    return NextResponse.json({
      status,
      output,
      error,
      runId: run.runId
    });
  } catch (error: any) {
    console.error('Workflow status error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch workflow status' }, { status: 500 });
  }
}

