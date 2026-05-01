import { Suspense } from 'react';
import { ProductDetail } from '@/sections/ProductDetail';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

type Props = {
  params: Promise<{ id: string }>
};

async function getProduct(id: string) {
  try {
    const docRef = doc(db, 'products', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    console.error("Error fetching product:", error);
    return null;
  }
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

  const title = product.seoTitle || `${product.title} | SmartChoose`;
  const description = product.seoDescription || product.description?.slice(0, 155) || '';
  const image = product.images?.[0] || 'https://smartchoose.in/logo.png';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [image],
      type: 'website',
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
