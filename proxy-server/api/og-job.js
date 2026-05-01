import { ImageResponse } from '@vercel/og';

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  try {
    const { searchParams } = new URL(req.url);
    
    // Get data from query params for 100% reliability (no DB fetch)
    const title = searchParams.get('title') || 'Job Opportunity';
    const company = searchParams.get('company') || 'Top Company';
    const location = searchParams.get('location') || 'India';
    const salary = searchParams.get('salary') || 'Best in Industry';

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0f172a', // Dark premium background
            backgroundImage: 'linear-gradient(to bottom right, #0f172a, #1e293b, #0f172a)',
            padding: '60px',
            fontFamily: 'sans-serif',
          }}
        >
          {/* Decorative Gradient Blobs */}
          <div style={{ position: 'absolute', top: -100, right: -100, width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, transparent 70%)', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', bottom: -150, left: -100, width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(56, 189, 248, 0.15) 0%, transparent 70%)', borderRadius: '50%' }} />

          {/* Main Card Container */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              backdropFilter: 'blur(10px)',
              borderRadius: '48px',
              padding: '70px',
              width: '100%',
              height: '100%',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              justifyContent: 'space-between',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
               <div style={{ width: '48px', height: '48px', backgroundColor: '#10b981', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
               </div>
               <div style={{ fontSize: '32px', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em' }}>SmartChoose <span style={{ color: '#10b981' }}>Jobs</span></div>
            </div>

            {/* Content */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#10b981' }}></div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Verified Opening</div>
               </div>
               <div style={{ fontSize: '72px', fontWeight: 900, color: '#fff', lineHeight: 1.1, letterSpacing: '-0.02em', textShadow: '0 10px 20px rgba(0,0,0,0.3)' }}>{title}</div>
               <div style={{ fontSize: '38px', fontWeight: 600, color: '#94a3b8' }}>at {company}</div>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '30px' }}>
               <div style={{ display: 'flex', gap: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#cbd5e1', fontSize: '24px', fontWeight: 700 }}>
                     <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                     {location}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#10b981', fontSize: '24px', fontWeight: 800 }}>
                     <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="6" width="20" height="12" rx="2"></rect><circle cx="12" cy="12" r="2"></circle></svg>
                     {salary}
                  </div>
               </div>
               <div style={{ fontSize: '20px', fontWeight: 700, color: '#475569' }}>smartchoose.in</div>
            </div>

            {/* Subtle Texture/Accent */}
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: '100%', height: '8px', background: 'linear-gradient(to right, #10b981, #3b82f6)' }} />
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e) {
    return new Response(`Failed to generate image: ${e.message}`, { status: 500 });
  }
}
