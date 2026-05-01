'use server';

import { revalidatePath } from 'next/cache';
import { requireParent } from '@/lib/parent/context';
import { markAllReadForParent } from '@/db/queries/notifications';

export async function markAllNotificationsReadAction() {
  const parent = await requireParent();
  await markAllReadForParent(parent.id);
  revalidatePath('/notifications');
  revalidatePath('/dashboard');
}
