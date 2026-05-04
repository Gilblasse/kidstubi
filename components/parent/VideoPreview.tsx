'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

export function VideoPreview({
  videoId,
  title,
  thumbnailUrl,
}: {
  videoId: string;
  title: string;
  thumbnailUrl: string;
}) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  function onDialogClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) setOpen(false);
  }

  const src =
    `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}` +
    `?rel=0&modestbranding=1&iv_load_policy=3&controls=1&playsinline=1&fs=1&autoplay=1`;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Preview ${title}`}
        className="group relative block aspect-video w-full shrink-0 overflow-hidden rounded-md bg-muted sm:w-40"
      >
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt=""
            fill
            sizes="(min-width: 640px) 160px, 100vw"
            className="object-cover transition group-hover:scale-[1.02]"
          />
        ) : null}
        <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-transparent transition group-hover:bg-black/40 group-hover:text-white">
          ▶ Play
        </span>
      </button>
      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        onClick={onDialogClick}
        className="fixed inset-0 m-auto h-fit max-h-[90vh] w-full max-w-3xl rounded-lg border border-border bg-card p-0 text-foreground shadow-xl backdrop:bg-black/60"
      >
        {open && (
          <div className="flex flex-col">
            <div className="flex items-start gap-3 border-b border-border px-4 py-3">
              <h2 className="line-clamp-2 min-w-0 flex-1 text-sm font-medium">
                {title}
              </h2>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
                aria-label="Close preview"
              >
                Close
              </Button>
            </div>
            <div className="relative aspect-video w-full bg-black">
              <iframe
                title={title}
                src={src}
                allow="accelerometer; encrypted-media; picture-in-picture"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                className="absolute inset-0 h-full w-full"
              />
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
