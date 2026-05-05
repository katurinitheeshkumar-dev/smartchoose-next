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
  const description = (product.seoDescription || product.description?.slice(0, 155) || '').replace(/[^\x20-\x7E]/g, ''); // Clean non-ASCII for safety
  
  // Ensure image is absolute and uses HTTPS
  let image = product.images?.[0];
  if (image && typeof image === 'string') {
    if (image.startsWith('//')) image = 'https:' + image;
    if (image.startsWith('http://')) image = image.replace('http://', 'https://');
    
    // For Amazon images, SL1500 might be too big for some crawlers. Use SL600 for OG.
    if (image.includes('media-amazon.com') || image.includes('ssl-images-amazon')) {
      image = image.replace(/\._[A-Z0-9,_]+_\./i, '._SL600_.');
    }
  } else {
    image = `${baseUrl}/logo.png`;
  }

  return {
    metadataBase: new URL(baseUrl),
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: 'SmartChoose',
      images: [
        {
          url: image,
          secureUrl: image,
          width: 1200,
          height: 630,
          alt: title,
          type: 'image/jpeg',
        },
      ],
      locale: 'en_IN',
      type: 'website',
      url: `/product/${id}`,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
      site: '@smartchoose',
    },
    alternates: {
      canonical: `/product/${id}`,
    },
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
