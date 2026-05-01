'use server';

import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';
import { getActiveKidId } from '@/lib/auth/activeKid';
import { getParentByClerkId } from '@/db/queries/parents';
import { getApprovedVideo } from '@/db/queries/videos';
import {
  computeRemainingSecondsForKid,
  openScreenTimeSession,
} from '@/db/queries/screenTime';

const schema = z.object({
  kidId: z.string().uuid(),
  videoId: z.string().min(1).max(64),
});

export async function startSessionAction(input: {
  kidId: string;
  videoId: string;
}): Promise<{ sessionId: string } | { error: 'unauthorized' | 'over_budget' | 'forbidden' }> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: 'forbidden' };

  const { userId } = await auth();
  if (!userId) return { error: 'unauthorized' };
  const parent = await getParentByClerkId(userId);
  if (!parent) return { error: 'unauthorized' };
  const activeKidId = await getActiveKidId();
  if (!activeKidId || activeKidId !== parsed.data.kidId) {
    return { error: 'forbidden' };
  }

  const video = await getApprovedVideo(
    parent.id,
    activeKidId,
    parsed.data.videoId,
  );
  if (!video) return { error: 'forbidden' };

  const { remainingSeconds } = await computeRemainingSecondsForKid(
    parent.id,
    activeKidId,
  );
  if (remainingSeconds <= 0) return { error: 'over_budget' };

  const session = await openScreenTimeSession(parent.id, activeKidId);
  return { sessionId: session.id };
}
