import { NextResponse } from 'next/server';

export const maxDuration = 60;
// Run as background (don't wait for response to complete generation)
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    // 1. Auth check
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Trigger generation in background (don't await — return immediately)
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'https://www.smartchoose.in';

    // Fire-and-forget: call the generate-blog API in background
    fetch(`${baseUrl}/api/workflows/generate-blog-trending`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cron-secret': process.env.CRON_SECRET || '',
      },
      body: JSON.stringify({ autoPublish: true }),
    }).catch((e) => console.error('[CRON] Background blog trigger failed:', e));

    return NextResponse.json({
      success: true,
      message: 'Daily auto-post triggered in background',
      time: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Daily Cron Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
