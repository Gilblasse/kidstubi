import { presetFromAvatarUrl } from '@/lib/avatars';

const SIZE_CLASSES = {
  sm: 'h-8 w-8 text-base',
  md: 'h-10 w-10 text-lg',
  lg: 'h-16 w-16 text-3xl',
  xl: 'h-20 w-20 text-4xl',
} as const;

export function KidAvatar({
  displayName,
  avatarUrl,
  size = 'md',
  className = '',
}: {
  displayName: string;
  avatarUrl: string | null | undefined;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}) {
  const preset = presetFromAvatarUrl(avatarUrl);
  const sizeClass = SIZE_CLASSES[size];

  if (preset) {
    return (
      <div
        className={`${sizeClass} ${preset.bg} flex shrink-0 items-center justify-center rounded-full ${className}`}
        aria-label={`${displayName} avatar`}
        title={displayName}
      >
        <span aria-hidden>{preset.emoji}</span>
      </div>
    );
  }

  return (
    <div
      className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full bg-muted font-semibold ${className}`}
      aria-label={`${displayName} avatar`}
      title={displayName}
    >
      {displayName.slice(0, 1).toUpperCase()}
    </div>
  );
}
