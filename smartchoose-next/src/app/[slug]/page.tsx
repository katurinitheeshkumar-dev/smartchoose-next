"use client";
import { Suspense } from 'react';
import BlogPostPage from '@/sections/BlogPostPage';

export default function SlugRoute() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="spinner" /></div>}>
      <BlogPostPage />
    </Suspense>
  );
}
