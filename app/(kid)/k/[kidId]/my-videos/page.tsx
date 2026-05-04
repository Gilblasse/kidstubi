import { redirect } from 'next/navigation';
import { requireKidContext } from '@/lib/kid/context';
import { MyVideosView } from '@/components/kid/MyVideosView';

export default async function KidMyVideosPage({
  params,
}: {
  params: Promise<{ kidId: string }>;
}) {
  const { kidId } = await params;
  const { kid } = await requireKidContext(kidId);
  if (!kid.discoveryEnabled) redirect(`/k/${kidId}`);
  return <MyVideosView kidId={kidId} />;
}
