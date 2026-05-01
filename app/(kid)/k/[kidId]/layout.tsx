import { requireKidContext } from '@/lib/kid/context';
import { KidShell } from '@/components/kid/KidShell';

export default async function KidLayout({
  params,
  children,
}: {
  params: Promise<{ kidId: string }>;
  children: React.ReactNode;
}) {
  const { kidId } = await params;
  const { kid } = await requireKidContext(kidId);

  return (
    <KidShell
      kidId={kidId}
      kidName={kid.displayName}
      kidAvatarUrl={kid.avatarUrl}
      searchEnabled={kid.searchEnabled}
    >
      {children}
    </KidShell>
  );
}
