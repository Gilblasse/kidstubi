'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';

export function MobileNav({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded transition-all hover:bg-accent active:translate-y-px active:scale-[0.98] md:hidden"
        aria-label="Open menu"
        aria-expanded={open}
      >
        <span aria-hidden className="text-xl leading-none">
          ☰
        </span>
      </button>
      {open && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 cursor-pointer bg-black/60 md:hidden"
        />
      )}
      <aside
        aria-label="Primary"
        className={
          'fixed inset-y-0 left-0 z-50 w-64 transform overflow-y-auto border-r border-border bg-card transition-transform duration-200 md:hidden ' +
          (open ? 'translate-x-0' : '-translate-x-full')
        }
      >
        {children}
      </aside>
    </>
  );
}
