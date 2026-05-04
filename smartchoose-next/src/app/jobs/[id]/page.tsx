import { Suspense } from 'react';
import JobDetailPage from '@/sections/JobDetailPage';
import { getJobById } from '@/lib/db';
import { notFound } from 'next/navigation';

export default async function JobDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await getJobById(id);

  if (!job) {
    notFound();
  }

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="spinner" /></div>}>
      <JobDetailPage initialJob={job} />
    </Suspense>
  );
}
