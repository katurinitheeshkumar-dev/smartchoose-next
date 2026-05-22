import { Suspense } from 'react';
import ContactClient from './ContactClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Us | SmartChoose',
  description: 'Get in touch with SmartChoose for product inquiries, support, or feedback.',
  alternates: {
    canonical: '/contact',
  },
};

export default function ContactRoute() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="spinner" /></div>}>
      <ContactClient />
    </Suspense>
  );
}
