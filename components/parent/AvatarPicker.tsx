import { AVATAR_PRESETS, DEFAULT_AVATAR_KEY } from '@/lib/avatars';

export function AvatarPicker({
  name,
  defaultKey,
  idPrefix,
}: {
  name: string;
  defaultKey?: string | null;
  idPrefix: string;
}) {
  const selected = defaultKey && AVATAR_PRESETS.some((p) => p.key === defaultKey)
    ? defaultKey
    : DEFAULT_AVATAR_KEY;

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">Avatar</legend>
      <div className="flex flex-wrap gap-2" role="radiogroup">
        {AVATAR_PRESETS.map((preset) => {
          const id = `${idPrefix}-${preset.key}`;
          return (
            <div key={preset.key}>
              <input
                type="radio"
                id={id}
                name={name}
                value={preset.key}
                defaultChecked={preset.key === selected}
                className="peer sr-only"
              />
              <label
                htmlFor={id}
                className={`flex h-12 w-12 cursor-pointer items-center justify-center rounded-full text-2xl ring-2 ring-transparent transition hover:ring-border peer-checked:ring-primary peer-focus-visible:ring-primary ${preset.bg}`}
                title={preset.label}
              >
                <span aria-hidden>{preset.emoji}</span>
                <span className="sr-only">{preset.label}</span>
              </label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
