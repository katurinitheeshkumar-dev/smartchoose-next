import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const t0 = Date.now();
  const results: any = {};

  try {
    // Check auth
    const auth = req.headers.get('authorization');
    results.auth = auth === `Bearer ${process.env.CRON_SECRET}` ? 'OK' : 'FAIL';

    // Check env keys exist
    results.hasGroqKey = !!process.env.GROQ_API_KEY;
    results.groqKeyPrefix = process.env.GROQ_API_KEY?.slice(0, 8) + '...';
    results.hasCronSecret = !!process.env.CRON_SECRET;

    // Test GROQ with 10s timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: 'Say "ok" in one word' }],
          max_tokens: 5,
          temperature: 0,
        }),
      });
      clearTimeout(timeout);
      results.groqStatus = groqRes.status;
      const data = await groqRes.json();
      results.groqResponse = data.choices?.[0]?.message?.content || data.error?.message || JSON.stringify(data).slice(0, 100);
    } catch (e: any) {
      clearTimeout(timeout);
      results.groqError = e.name === 'AbortError' ? 'TIMEOUT after 10s' : e.message;
    }

    results.elapsed = `${((Date.now() - t0) / 1000).toFixed(1)}s`;
    return NextResponse.json(results);
  } catch (e: any) {
    return NextResponse.json({ error: e.message, elapsed: `${((Date.now() - t0) / 1000).toFixed(1)}s` }, { status: 500 });
  }
}
