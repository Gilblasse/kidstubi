'use client';

import { useEffect, useRef } from 'react';

export function SelectAllCheckbox({
  checkboxName,
  label = 'Select all on this page',
}: {
  checkboxName: string;
  label?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);

  function toggle(e: React.ChangeEvent<HTMLInputElement>) {
    const root = ref.current?.form;
    if (!root) return;
    const boxes = root.querySelectorAll<HTMLInputElement>(
      `input[type="checkbox"][name="${checkboxName}"]`,
    );
    boxes.forEach((b) => {
      b.checked = e.target.checked;
    });
  }

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const root = el.form;
    if (!root) return;
    function sync() {
      if (!el || !root) return;
      const boxes = root.querySelectorAll<HTMLInputElement>(
        `input[type="checkbox"][name="${checkboxName}"]`,
      );
      const total = boxes.length;
      const checked = Array.from(boxes).filter((b) => b.checked).length;
      el.checked = total > 0 && checked === total;
      el.indeterminate = checked > 0 && checked < total;
    }
    root.addEventListener('change', sync);
    sync();
    return () => root.removeEventListener('change', sync);
  }, [checkboxName]);

  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <input
        ref={ref}
        type="checkbox"
        onChange={toggle}
        className="h-4 w-4 rounded border-input"
      />
      {label}
    </label>
  );
}
