import { NextResponse } from 'next/server';
import { algoliasearch } from 'algoliasearch';

const client = algoliasearch(
  process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!,
  process.env.ALGOLIA_WRITE_KEY!
);

const INDEX_NAME = 'products';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const adminKey = request.headers.get('x-admin-key');
    const secret = process.env.ADMIN_SECRET_KEY || 'smart-choose-2024';
    
    // Check either Bearer token or custom admin key header
    if (authHeader !== `Bearer ${secret}` && adminKey !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, data } = await request.json();

    if (action === 'sync_all') {
      const { products } = data;
      if (!Array.isArray(products)) {
        return NextResponse.json({ error: 'Products array required' }, { status: 400 });
      }
      
      const objects = products.map((p: any) => ({
        ...p,
        objectID: p.id,
      }));

      await client.saveObjects({
        indexName: INDEX_NAME,
        objects,
      });

      return NextResponse.json({ success: true, message: `Synced ${objects.length} products to Algolia` });
    }
    
    if (action === 'sync_single') {
      const { product } = data;
      if (!product || !product.id) {
        return NextResponse.json({ error: 'Product with id required' }, { status: 400 });
      }

      await client.saveObjects({
        indexName: INDEX_NAME,
        objects: [{ ...product, objectID: product.id }],
      });

      return NextResponse.json({ success: true, message: `Synced product ${product.id} to Algolia` });
    }

    if (action === 'delete_single') {
      const { productId } = data;
      if (!productId) {
        return NextResponse.json({ error: 'productId required' }, { status: 400 });
      }

      await client.deleteObject({
        indexName: INDEX_NAME,
        objectID: productId,
      });

      return NextResponse.json({ success: true, message: `Deleted product ${productId} from Algolia` });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    console.error('Algolia Sync Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
