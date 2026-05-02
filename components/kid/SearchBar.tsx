'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

export function SearchBar({
  kidId,
  defaultValue = '',
}: {
  kidId: string;
  defaultValue?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [value, setValue] = useState(defaultValue);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const q = value.trim();
        if (!q) return;
        router.push(`/k/${kidId}/search?q=${encodeURIComponent(q)}`);
      }}
      className="flex w-full max-w-xl"
      role="search"
    >
      <input
        type="search"
        name="q"
        value={value}
        onChange={(e) => {
          const next = e.target.value;
          setValue(next);
          if (next.trim() === '' && pathname === `/k/${kidId}/search`) {
            router.push(`/k/${kidId}`);
          }
        }}
        placeholder="Search"
        className="h-9 flex-1 rounded-l-full border border-input bg-card px-4 text-sm outline-none focus:border-ring"
      />
      <button
        type="submit"
        className="cursor-pointer rounded-r-full border border-l-0 border-input bg-card px-4 text-sm font-medium transition-all hover:bg-accent active:translate-y-px active:scale-[0.98]"
      >
        Go
      </button>
    </form>
  );
}
