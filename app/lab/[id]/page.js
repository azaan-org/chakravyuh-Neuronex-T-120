import { notFound } from 'next/navigation';
import { LABS } from '@/lib/labs';
import LabClient from './LabClient';

export function generateStaticParams() { return Object.keys(LABS).map(id => ({ id })); }

export async function generateMetadata({ params }) {
  const { id } = await params;
  return { title: (LABS[id]?.title || 'Lab') + ' · PulseENTC' };
}

export default async function LabPage({ params }) {
  const { id } = await params;
  const lab = LABS[id];
  if (!lab) notFound();
  return <LabClient labId={id} />;
}
