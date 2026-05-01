import { ensureParent } from '@/lib/clerk/ensureParent';

export default async function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await ensureParent();
  return <>{children}</>;
}
