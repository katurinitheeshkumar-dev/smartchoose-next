"use client";
import { Suspense } from 'react';
import { BlogListingPage } from '@/sections/BlogListingPage';

export default function BlogRoute() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="spinner" /></div>}>
      <BlogListingPage />
    </Suspense>
  );
}
