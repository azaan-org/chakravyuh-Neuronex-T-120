import { notFound } from 'next/navigation';
import { WORKBENCHES } from '@/lib/workbench';
import WorkbenchClient from './WorkbenchClient';

export function generateStaticParams() { return Object.keys(WORKBENCHES).map(id => ({ id })); }
export async function generateMetadata({ params }) { const { id } = await params; return { title: (WORKBENCHES[id]?.title || 'Workbench') + ' · PulseENTC' }; }

export default async function Page({ params }) {
  const { id } = await params;
  if (!WORKBENCHES[id]) notFound();
  return <WorkbenchClient id={id} />;
}
