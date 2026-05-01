"use client";
import { Suspense } from 'react';
import JobDetailPage from '@/sections/JobDetailPage';

export default function JobDetailRoute() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="spinner" /></div>}>
      <JobDetailPage />
    </Suspense>
  );
}
