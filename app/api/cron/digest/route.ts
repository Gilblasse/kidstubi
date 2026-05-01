import { NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { isCronAuthorized } from '@/lib/cron/auth';
import { getDb } from '@/db/client';
import {
  kidProfiles,
  parents,
  pendingVideoApprovals,
} from '@/db/schema';
import { isNull } from 'drizzle-orm';
import {
  findDigestRunForDay,
  recordDigestRun,
} from '@/db/queries/notifications';
import { sendDigest } from '@/lib/notifications';

function todayUtcKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const dayKey = todayUtcKey();
  const rows = await getDb()
    .select({
      parentId: parents.id,
      parentEmail: parents.email,
      source: pendingVideoApprovals.source,
      count: sql<number>`count(*)::int`,
    })
    .from(pendingVideoApprovals)
    .innerJoin(kidProfiles, eq(pendingVideoApprovals.kidProfileId, kidProfiles.id))
    .innerJoin(parents, eq(kidProfiles.parentId, parents.id))
    .where(isNull(pendingVideoApprovals.resolvedAt))
    .groupBy(parents.id, parents.email, pendingVideoApprovals.source);

  const summaries = new Map<
    string,
    {
      parentId: string;
      parentEmail: string | null;
      channelUploadCount: number;
      searchRequestCount: number;
    }
  >();
  for (const r of rows) {
    const s =
      summaries.get(r.parentId) ?? {
        parentId: r.parentId,
        parentEmail: r.parentEmail,
        channelUploadCount: 0,
        searchRequestCount: 0,
      };
    if (r.source === 'channel_upload') s.channelUploadCount = Number(r.count);
    else if (r.source === 'kid_search_request')
      s.searchRequestCount = Number(r.count);
    summaries.set(r.parentId, s);
  }

  let sent = 0;
  for (const s of summaries.values()) {
    const total = s.channelUploadCount + s.searchRequestCount;
    if (total === 0) continue;
    const existing = await findDigestRunForDay(s.parentId, dayKey);
    if (existing) continue;
    await sendDigest({
      parentId: s.parentId,
      parentEmail: s.parentEmail,
      pendingCount: total,
      channelUploadCount: s.channelUploadCount,
      searchRequestCount: s.searchRequestCount,
    });
    await recordDigestRun(s.parentId, dayKey);
    sent++;
  }

  return NextResponse.json({ ok: true, dayKey, sent });
}
