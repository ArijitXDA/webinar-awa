import { Suspense } from 'react';
import type { Metadata } from 'next';
import Landing1Client from './Landing1Client';

export const metadata: Metadata = {
  title: 'Master AI with oStaran — Free Certificate Webinar',
  description:
    'Answer a few quick questions and get a personalized AI learning path, then reserve your seat in a free live oStaran webinar.',
  robots: { index: false, follow: false },
};

export default function Landing1Page() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-slate-50" />}>
      <Landing1Client />
    </Suspense>
  );
}
