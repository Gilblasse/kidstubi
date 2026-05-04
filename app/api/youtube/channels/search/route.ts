import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getParentByClerkId } from '@/db/queries/parents';
import { searchChannels } from '@/lib/youtube/channels';

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const parent = await getParentByClerkId(userId);
  if (!parent) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const q = new URL(request.url).searchParams.get('q')?.trim() ?? '';
  if (q.length < 2) return NextResponse.json({ results: [] });

  const results = await searchChannels(q, 8);
  return NextResponse.json(
    { results },
    { headers: { 'Cache-Control': 'private, max-age=60' } },
  );
}
