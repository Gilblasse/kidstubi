'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useLayoutEffect, useRef, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { lookupChannelAction } from '@/app/(parent)/(needs-pin)/kids/[kidId]/channels/actions';

type Result = {
  channelId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
};

export function ChannelTypeahead({ kidId }: { kidId: string }) {
  const router = useRouter();
  const inputId = useId();
  const listboxId = useId();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [anchorRect, setAnchorRect] = useState<{
    left: number;
    top: number;
    width: number;
  } | null>(null);
  const [value, setValue] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const q = value.trim();
    if (q.length < 2) return;
    const ctrl = new AbortController();
    abortRef.current?.abort();
    abortRef.current = ctrl;
    const handle = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(
          `/api/youtube/channels/search?q=${encodeURIComponent(q)}`,
          { signal: ctrl.signal },
        );
        if (!res.ok) throw new Error('search failed');
        const data = (await res.json()) as { results: Result[] };
        setResults(data.results);
        setActiveIndex(data.results.length > 0 ? 0 : -1);
      } catch (err) {
        if ((err as { name?: string })?.name === 'AbortError') return;
        setResults([]);
        setActiveIndex(-1);
      } finally {
        if (!ctrl.signal.aborted) setIsLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(handle);
      ctrl.abort();
    };
  }, [value]);

  function onValueChange(next: string) {
    setValue(next);
    setOpen(true);
    if (next.trim().length < 2) {
      abortRef.current?.abort();
      setResults([]);
      setActiveIndex(-1);
      setIsLoading(false);
    }
  }

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  const showDropdownEarly = open && value.trim().length >= 2;

  useLayoutEffect(() => {
    if (!showDropdownEarly) return;
    function update() {
      const el = anchorRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setAnchorRect({ left: r.left, top: r.bottom, width: r.width });
    }
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [showDropdownEarly]);

  function selectResult(r: Result) {
    setOpen(false);
    setValue('');
    startTransition(() => {
      router.push(`/kids/${kidId}/channels/${r.channelId}/review`);
    });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      if (results.length > 0) setOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (results.length === 0 ? -1 : (i + 1) % results.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) =>
        results.length === 0 ? -1 : (i - 1 + results.length) % results.length,
      );
    } else if (e.key === 'Enter') {
      const r = results[activeIndex];
      if (open && r) {
        e.preventDefault();
        selectResult(r);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  const showDropdown = showDropdownEarly && anchorRect !== null;

  return (
    <form
      action={lookupChannelAction}
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
    >
      <input type="hidden" name="kidId" value={kidId} />
      <div className="flex-1" ref={wrapperRef}>
        <Label htmlFor={inputId}>YouTube URL, @handle, or channel ID</Label>
        <div ref={anchorRef}>
          <Input
            id={inputId}
            name="channelInput"
            required
            autoComplete="off"
            placeholder="@TEDEd or https://youtube.com/@TEDEd"
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            role="combobox"
            aria-expanded={showDropdown}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={
              showDropdown && activeIndex >= 0
                ? `${listboxId}-opt-${activeIndex}`
                : undefined
            }
          />
          {showDropdown && anchorRect && (
            <ul
              id={listboxId}
              role="listbox"
              style={{
                position: 'fixed',
                left: anchorRect.left,
                top: anchorRect.top + 4,
                width: anchorRect.width,
              }}
              className="z-50 max-h-80 overflow-y-auto rounded-lg border border-border bg-popover text-popover-foreground shadow-lg"
            >
              {isLoading && results.length === 0 ? (
                <li className="px-3 py-3 text-sm text-muted-foreground">
                  Searching…
                </li>
              ) : results.length === 0 ? (
                <li className="px-3 py-3 text-sm text-muted-foreground">
                  No channels found.
                </li>
              ) : (
                results.map((r, i) => (
                  <li
                    key={r.channelId}
                    id={`${listboxId}-opt-${i}`}
                    role="option"
                    aria-selected={i === activeIndex}
                    onMouseEnter={() => setActiveIndex(i)}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      selectResult(r);
                    }}
                    className={`flex cursor-pointer items-center gap-3 px-3 py-2 ${
                      i === activeIndex ? 'bg-accent' : ''
                    }`}
                  >
                    <span className="relative size-9 shrink-0 overflow-hidden rounded-full bg-muted">
                      {r.thumbnailUrl ? (
                        <Image
                          src={r.thumbnailUrl}
                          alt=""
                          fill
                          sizes="36px"
                          className="object-cover"
                        />
                      ) : null}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {r.title}
                    </span>
                    <span className="ml-3 truncate font-mono text-xs text-muted-foreground">
                      {r.channelId}
                    </span>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      </div>
      <Button type="submit" disabled={isPending}>
        Find channel
      </Button>
    </form>
  );
}
