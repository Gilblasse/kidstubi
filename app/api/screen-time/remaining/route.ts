import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getActiveKidId } from '@/lib/auth/activeKid';
import { getParentByClerkId } from '@/db/queries/parents';
import { computeRemainingSecondsForKid } from '@/db/queries/screenTime';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const parent = await getParentByClerkId(userId);
  if (!parent) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const activeKidId = await getActiveKidId();
  if (!activeKidId) return NextResponse.json({ error: 'no_active_kid' }, { status: 403 });

  const { remainingSeconds, withinAllowedWindow } =
    await computeRemainingSecondsForKid(parent.id, activeKidId);
  return NextResponse.json(
    {
      remaining_seconds: remainingSeconds,
      within_allowed_window: withinAllowedWindow,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
