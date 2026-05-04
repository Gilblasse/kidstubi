'use client';

import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';

function snapshot(form: HTMLFormElement): string {
  const grouped: Record<string, string[]> = {};
  for (const [k, v] of new FormData(form).entries()) {
    (grouped[k] ??= []).push(typeof v === 'string' ? v : `__file:${v.size}`);
  }
  for (const k of Object.keys(grouped)) grouped[k].sort();
  return JSON.stringify(
    Object.keys(grouped)
      .sort()
      .map((k) => [k, grouped[k]]),
  );
}

type Props = Omit<ComponentProps<typeof Button>, 'type'>;

export function SaveButton({ children, disabled, ...rest }: Props) {
  const ref = useRef<HTMLButtonElement | null>(null);
  const initialRef = useRef<string>('');
  const [dirty, setDirty] = useState(false);
  const { pending } = useFormStatus();
  const wasPending = useRef(false);

  useEffect(() => {
    const form = ref.current?.closest('form');
    if (!form) return;
    initialRef.current = snapshot(form);
    setDirty(false);
    const onChange = () => setDirty(snapshot(form) !== initialRef.current);
    form.addEventListener('input', onChange);
    form.addEventListener('change', onChange);
    const mo = new MutationObserver(onChange);
    mo.observe(form, { childList: true, subtree: true });
    return () => {
      form.removeEventListener('input', onChange);
      form.removeEventListener('change', onChange);
      mo.disconnect();
    };
  }, []);

  useEffect(() => {
    if (pending) {
      wasPending.current = true;
      return;
    }
    if (!wasPending.current) return;
    wasPending.current = false;
    const form = ref.current?.closest('form');
    if (!form) return;
    initialRef.current = snapshot(form);
    setDirty(false);
  }, [pending]);

  return (
    <Button
      ref={ref}
      type="submit"
      disabled={pending || !dirty || disabled}
      {...rest}
    >
      {children}
    </Button>
  );
}
