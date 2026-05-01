import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { getActiveKidId } from '@/lib/auth/activeKid';
import { getParentByClerkId } from '@/db/queries/parents';
import { getKidProfileByIdForParent } from '@/db/queries/kidProfiles';
import { runKidSearch } from '@/lib/kid/search';

const schema = z.object({ q: z.string().trim().min(1).max(100) });

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const parent = await getParentByClerkId(userId);
  if (!parent) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const activeKidId = await getActiveKidId();
  if (!activeKidId) return NextResponse.json({ error: 'no_active_kid' }, { status: 403 });
  const kid = await getKidProfileByIdForParent(parent.id, activeKidId);
  if (!kid) return NextResponse.json({ error: 'no_active_kid' }, { status: 403 });

  const url = new URL(request.url);
  const parsed = schema.safeParse({ q: url.searchParams.get('q') ?? '' });
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_query' }, { status: 400 });
  }

  try {
    const results = await runKidSearch(parent, kid, parsed.data.q);
    return NextResponse.json(
      { results },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    if (e instanceof Error && e.message === 'search_disabled') {
      return NextResponse.json({ error: 'search_disabled' }, { status: 403 });
    }
    throw e;
  }
}
