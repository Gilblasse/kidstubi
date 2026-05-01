'use client';

export function WatchPlayer({ videoId, title }: { videoId: string; title: string }) {
  const src =
    `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}` +
    `?rel=0&modestbranding=1&iv_load_policy=3&controls=1&playsinline=1&fs=1&disablekb=1`;
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
      <iframe
        title={title}
        src={src}
        allow="accelerometer; encrypted-media; picture-in-picture"
        allowFullScreen
        sandbox="allow-scripts allow-same-origin allow-presentation"
        referrerPolicy="strict-origin-when-cross-origin"
        className="absolute inset-0 h-full w-full"
      />
    </div>
  );
}
