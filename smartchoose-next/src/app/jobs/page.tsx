"use client";
import { Suspense } from 'react';
import JobsPage from '@/sections/JobsPage';

export default function JobsRoute() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="spinner" /></div>}>
      <JobsPage />
    </Suspense>
  );
}
