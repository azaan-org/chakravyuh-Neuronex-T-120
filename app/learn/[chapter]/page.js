import { notFound } from 'next/navigation';
import { CHAPTERS, chapterById } from '@/lib/curriculum';
import ChapterClient from './ChapterClient';

export function generateStaticParams() { return CHAPTERS.map(c => ({ chapter: c.id })); }
export async function generateMetadata({ params }) { const { chapter } = await params; return { title: (chapterById(chapter)?.title || 'Chapter') + ' · PulseENTC' }; }

export default async function Page({ params }) {
  const { chapter } = await params;
  if (!chapterById(chapter)) notFound();
  return <ChapterClient id={chapter} />;
}
