import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { getActiveKidId } from '@/lib/auth/activeKid';
import { getParentByClerkId } from '@/db/queries/parents';
import { recordWatch } from '@/db/queries/history';
import {
  closeScreenTimeSession,
  computeRemainingSecondsForKid,
} from '@/db/queries/screenTime';

const schema = z.object({
  kidId: z.string().uuid(),
  videoId: z.string().min(1).max(64),
  secondsWatched: z.number().int().min(0).max(4 * 3600),
  sessionId: z.string().uuid().nullable().optional(),
});

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const parent = await getParentByClerkId(userId);
  if (!parent) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const activeKidId = await getActiveKidId();
  if (!activeKidId) return NextResponse.json({ error: 'no_active_kid' }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid' }, { status: 400 });
  if (parsed.data.kidId !== activeKidId) {
    return NextResponse.json({ error: 'kid_mismatch' }, { status: 403 });
  }

  const { remainingSeconds } = await computeRemainingSecondsForKid(
    parent.id,
    activeKidId,
  );
  if (remainingSeconds <= 0 && parsed.data.secondsWatched > 0) {
    if (parsed.data.sessionId) {
      await closeScreenTimeSession(parent.id, parsed.data.sessionId, 0);
    }
    return NextResponse.json({ error: 'over_budget' }, { status: 403 });
  }

  try {
    await recordWatch({
      parentId: parent.id,
      kidProfileId: activeKidId,
      youtubeVideoId: parsed.data.videoId,
      secondsWatched: parsed.data.secondsWatched,
    });
  } catch {
    if (parsed.data.sessionId) {
      await closeScreenTimeSession(parent.id, parsed.data.sessionId, 0);
    }
    return NextResponse.json({ error: 'rejected' }, { status: 403 });
  }

  if (parsed.data.sessionId) {
    await closeScreenTimeSession(
      parent.id,
      parsed.data.sessionId,
      parsed.data.secondsWatched,
    );
  }

  return NextResponse.json({ ok: true });
}
