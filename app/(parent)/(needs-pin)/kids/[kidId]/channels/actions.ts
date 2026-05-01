'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireParentKid } from '@/lib/parent/context';
import { getChannelByIdOrUrl } from '@/lib/youtube/channels';

const schema = z.object({
  kidId: z.string().uuid(),
  channelInput: z.string().min(1).max(200),
});

export async function lookupChannelAction(formData: FormData) {
  const { kidId, channelInput } = schema.parse({
    kidId: formData.get('kidId'),
    channelInput: formData.get('channelInput'),
  });
  await requireParentKid(kidId);
  const channel = await getChannelByIdOrUrl(channelInput);
  if (!channel) {
    redirect(
      `/kids/${kidId}/channels?error=${encodeURIComponent('Channel not found')}`,
    );
  }
  redirect(`/kids/${kidId}/channels/${channel.channelId}/review`);
}
