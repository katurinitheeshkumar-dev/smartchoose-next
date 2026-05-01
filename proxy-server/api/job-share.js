const FIREBASE_PROJECT = process.env.FIREBASE_PROJECT || 'smartchoose-official';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents`;

function fromFirestore(doc) {
  if (!doc || !doc.fields) return null;
  const data = { id: doc.name ? doc.name.split('/').pop() : 'unknown' };
  for (const [k, v] of Object.entries(doc.fields)) {
    if (v.stringValue !== undefined) data[k] = v.stringValue;
    else if (v.booleanValue !== undefined) data[k] = v.booleanValue;
    else if (v.integerValue !== undefined) data[k] = v.integerValue;
    else if (v.doubleValue !== undefined) data[k] = v.doubleValue;
  }
  return data;
}

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).send('Missing job ID');
  }

  try {
    const jobRes = await fetch(`${BASE_URL}/jobs/${id}`);
    if (!jobRes.ok) {
      // Fallback redirect if job not found
      return res.send(`
        <html>
          <head>
            <meta http-equiv="refresh" content="0; url=https://smartchoose.in/jobs">
          </head>
          <body>Redirecting...</body>
        </html>
      `);
    }

    const job = fromFirestore(await jobRes.json());
    const siteUrl = 'https://smartchoose.in';
    const destinationUrl = `${siteUrl}/jobs/${id}`;
    
    // Clean description for meta tags
    const cleanDesc = job.description?.substring(0, 160).replace(/[<>"']/g, '') || "Apply for this job on SmartChoose";

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${job.title} | ${job.company}</title>
        
        <!-- OpenGraph Meta Tags -->
        <meta property="og:title" content="Career Alert! ${job.title}">
        <meta property="og:description" content="Hiring at ${job.company} (${job.location}). ${cleanDesc}">
        <meta property="og:image" content="${siteUrl}/logo-og.png">
        <meta property="og:url" content="${destinationUrl}">
        <meta property="og:type" content="website">
        
        <!-- Twitter Meta Tags -->
        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:title" content="${job.title} at ${job.company}">
        <meta name="twitter:description" content="${cleanDesc}">
        
        <!-- Immediate Redirect -->
        <script>
          window.location.replace("${destinationUrl}");
        </script>
        
        <style>
          body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; color: #64748b; background: #f8fafc; }
          .loader { border: 4px solid #f3f3f3; border-top: 4px solid #10b981; border-radius: 50%; width: 30px; height: 30px; animation: spin 2s linear infinite; margin-bottom: 20px; }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          .container { text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="loader" style="margin: 0 auto 1rem;"></div>
          <p>Redirecting to ${job.title} opening at ${job.company}...</p>
          <p style="font-size: 0.8rem;">If not redirected, <a href="${destinationUrl}">click here</a>.</p>
        </div>
      </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(html);
  } catch (error) {
    console.error('Job Preview Error:', error);
    return res.status(500).send('Internal Server Error');
  }
}
