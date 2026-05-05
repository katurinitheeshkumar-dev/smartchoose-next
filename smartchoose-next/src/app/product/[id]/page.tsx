import { Suspense } from 'react';
import { ProductDetail } from '@/sections/ProductDetail';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

type Props = {
  params: Promise<{ id: string }>
};

import { getProductById } from '@/lib/db';

async function getProduct(id: string) {
  return await getProductById(id);
}

export async function generateMetadata(
  { params }: Props
): Promise<Metadata> {
  const { id } = await params;
  const product: any = await getProduct(id);

  if (!product) {
    return {
      title: 'Product Not Found | SmartChoose'
    };
  }

  const baseUrl = 'https://www.smartchoose.in';
  const title = product.seoTitle || `${product.title} | SmartChoose`;
  const description = product.seoDescription || product.description?.slice(0, 155) || '';
  
  // Ensure image is absolute and uses HTTPS
  let image = product.images?.[0];
  if (image && typeof image === 'string') {
    if (image.startsWith('//')) image = 'https:' + image;
    if (image.startsWith('http://')) image = image.replace('http://', 'https://');
  } else {
    image = `${baseUrl}/logo.png`;
  }

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{
        url: image,
        width: 1200,
        height: 630,
        alt: title
      }],
      type: 'website',
      url: `${baseUrl}/product/${id}`,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    }
  };
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) {
    notFound();
  }

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="spinner" /></div>}>
      <ProductDetail productId={id} initialProduct={product} />
    </Suspense>
  );
}
