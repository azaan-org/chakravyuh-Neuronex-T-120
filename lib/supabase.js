'use client';
import { createClient } from '@supabase/supabase-js';

// Publishable (anon) key: safe to ship to the browser. Row Level Security on
// the `events` table only allows inserting and reading learning events.
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://efkhymaziqohuuqxyoqb.supabase.co';
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_HRkRFrUf5eS_RciWr2yuGg_ohIKnsLf';

let client = null;
export function supabase() {
  if (!client) client = createClient(URL, KEY, { auth: { persistSession: false } });
  return client;
}

export async function logEvent(row) {
  try {
    const { error } = await supabase().from('events').insert(row);
    if (error) console.warn('logEvent', error.message);
  } catch (e) { console.warn('logEvent failed', e); }
}
