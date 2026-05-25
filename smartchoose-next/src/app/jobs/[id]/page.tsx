import { Suspense } from 'react';
import JobDetailPage from '@/sections/JobDetailPage';
import { getJobById } from '@/lib/db';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

type Props = {
  params: Promise<{ id: string }>
};

export async function generateMetadata(
  { params }: Props
): Promise<Metadata> {
  const { id } = await params;
  const job = await getJobById(id);

  if (!job) {
    return {
      title: 'Job Not Found | SmartChoose'
    };
  }

  const title = `${job.title} | Careers at SmartChoose`;
  const description = `Apply for the ${job.title} role at SmartChoose in ${job.location || 'Remote'}.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/jobs/${id}`,
    },
    openGraph: {
      title,
      description,
      type: 'website',
      url: `https://smartchoose.in/jobs/${id}`,
    }
  };
}

export default async function JobDetailRoute({ params }: Props) {
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
