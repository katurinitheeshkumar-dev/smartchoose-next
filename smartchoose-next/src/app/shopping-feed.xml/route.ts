import { NextResponse } from 'next/server';

export async function GET() {
  const SITE_URL = 'https://www.smartchoose.in';
  const FIREBASE_PROJECT_ID = 'smartchoose-official'; // Unified to official project
  
  try {
    // Using the REST API for stability and to avoid QUIC issues
    const response = await fetch(
      `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/products?mask.fieldPaths=title&mask.fieldPaths=description&mask.fieldPaths=price&mask.fieldPaths=images&mask.fieldPaths=brand&mask.fieldPaths=category&mask.fieldPaths=published&pageSize=1000`,
      { next: { revalidate: 3600 } } // Cache for 1 hour
    );
    
    const data = await response.json();
    const products = (data.documents || [])
      .map((doc: any) => {
        const fields = doc.fields;
        const id = doc.name.split('/').pop();
        return {
          id,
          title: fields.title?.stringValue || '',
          description: fields.description?.stringValue || '',
          price: fields.price?.stringValue || '',
          images: fields.images?.arrayValue?.values?.map((v: any) => v.stringValue) || [],
          brand: fields.brand?.stringValue || '',
          category: fields.category?.stringValue || '',
          published: fields.published?.booleanValue ?? false
        };
      })
      .filter((p: any) => p.published);

    const entities: Record<string, string> = {
      '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;'
    };

    const feedItems = products.map((p: any) => {
      const cleanDesc = (p.description || p.title || '').replace(/[<>&"']/g, (c: string) => entities[c] || c).substring(0, 5000);
      
      const cleanTitle = (p.title || '').replace(/[<>&"']/g, (c: string) => entities[c] || c);

      const price = p.price || '0';
      const numericPrice = price.replace(/[^0-9.]/g, '');
      const finalPrice = numericPrice ? `${numericPrice} INR` : '0 INR';

      return `
    <item>
      <g:id>${p.id}</g:id>
      <g:title>${cleanTitle}</g:title>
      <g:description>${cleanDesc}</g:description>
      <g:link>${SITE_URL}/product/${p.id}</g:link>
      <g:image_link>${p.images?.[0] || ''}</g:image_link>
      <g:price>${finalPrice}</g:price>
      <g:availability>in_stock</g:availability>
      <g:condition>new</g:condition>
      <g:brand>${p.brand || 'SmartChoose'}</g:brand>
      <g:identifier_exists>no</g:identifier_exists>
      <g:product_type>${p.category || 'General'}</g:product_type>
      <g:google_product_category>${p.category || 'General'}</g:google_product_category>
      <g:shipping>
        <g:country>IN</g:country>
        <g:price>0 INR</g:price>
      </g:shipping>
    </item>`;
    }).join('');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>SmartChoose - Product Feed</title>
    <link>${SITE_URL}</link>
    <description>SmartChoose affiliate product feed for Google Merchant Center</description>
    ${feedItems}
  </channel>
</rss>`;

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=59',
      },
    });
  } catch (error) {
    console.error('Feed generation error:', error);
    return new NextResponse('Error generating feed', { status: 500 });
  }
}
