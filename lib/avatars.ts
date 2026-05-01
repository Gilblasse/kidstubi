export type AvatarPreset = {
  key: string;
  emoji: string;
  bg: string;
  label: string;
};

export const AVATAR_PRESETS: readonly AvatarPreset[] = [
  { key: 'fox', emoji: '🦊', bg: 'bg-orange-300', label: 'Fox' },
  { key: 'panda', emoji: '🐼', bg: 'bg-zinc-200', label: 'Panda' },
  { key: 'frog', emoji: '🐸', bg: 'bg-green-300', label: 'Frog' },
  { key: 'cat', emoji: '🐱', bg: 'bg-amber-200', label: 'Cat' },
  { key: 'unicorn', emoji: '🦄', bg: 'bg-pink-300', label: 'Unicorn' },
  { key: 'dino', emoji: '🦖', bg: 'bg-emerald-300', label: 'Dino' },
  { key: 'rocket', emoji: '🚀', bg: 'bg-indigo-300', label: 'Rocket' },
  { key: 'robot', emoji: '🤖', bg: 'bg-sky-300', label: 'Robot' },
  { key: 'star', emoji: '⭐', bg: 'bg-yellow-300', label: 'Star' },
  { key: 'octopus', emoji: '🐙', bg: 'bg-fuchsia-300', label: 'Octopus' },
  { key: 'turtle', emoji: '🐢', bg: 'bg-lime-300', label: 'Turtle' },
  { key: 'whale', emoji: '🐳', bg: 'bg-cyan-300', label: 'Whale' },
] as const;

const PRESET_PREFIX = 'preset:';

export const DEFAULT_AVATAR_KEY = AVATAR_PRESETS[0]!.key;

export function avatarValue(key: string): string {
  return `${PRESET_PREFIX}${key}`;
}

export function presetFromAvatarUrl(value: string | null | undefined): AvatarPreset | null {
  if (!value || !value.startsWith(PRESET_PREFIX)) return null;
  const key = value.slice(PRESET_PREFIX.length);
  return AVATAR_PRESETS.find((p) => p.key === key) ?? null;
}

export function isValidAvatarKey(key: string): boolean {
  return AVATAR_PRESETS.some((p) => p.key === key);
}
