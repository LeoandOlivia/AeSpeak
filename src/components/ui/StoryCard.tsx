import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=600&h=400&fit=crop&q=80&auto=format';

function ResilientImage({
  src,
  alt,
  className,
  fallback = FALLBACK_IMAGE,
}: {
  src: string;
  alt: string;
  className?: string;
  fallback?: string;
}) {
  const [url, setUrl] = useState(src);

  useEffect(() => {
    setUrl(src);
  }, [src]);

  return (
    <img
      src={url}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => {
        if (url !== fallback) setUrl(fallback);
      }}
    />
  );
}

interface StoryCardProps {
  imageUrl: string;
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  variant?: 'hero' | 'standard' | 'compact';
  onClick?: () => void;
  imageFallback?: string;
}

export function StoryCard({
  imageUrl,
  title,
  subtitle,
  badge,
  variant = 'standard',
  onClick,
  imageFallback,
}: StoryCardProps) {
  const isHero = variant === 'hero';
  const isCompact = variant === 'compact';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group w-full overflow-hidden rounded-xl border border-[var(--color-separator)] bg-[var(--color-bg-elevated)] text-left shadow-sm transition active:scale-[0.99] ${
        isHero ? 'mb-4' : ''
      }`}
    >
      <div className={`relative overflow-hidden ${isHero ? 'h-48' : isCompact ? 'h-24' : 'h-32'}`}>
        <ResilientImage
          src={imageUrl}
          alt=""
          fallback={imageFallback}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        {badge}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3
            className={`font-serif font-bold leading-tight text-white drop-shadow ${
              isHero ? 'text-2xl' : isCompact ? 'text-sm' : 'text-base'
            }`}
          >
            {title}
          </h3>
          {subtitle && (
            <p
              className={`mt-0.5 line-clamp-2 text-white/85 ${
                isHero ? 'text-sm' : 'text-xs'
              }`}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

interface StoryListItemProps {
  imageUrl: string;
  title: string;
  description?: string;
  index?: number;
  isActive?: boolean;
  onClick?: () => void;
  imageFallback?: string;
}

export function StoryListItem({
  imageUrl,
  title,
  description,
  index,
  isActive,
  onClick,
  imageFallback,
}: StoryListItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full gap-3 border-b border-[var(--color-separator)] py-3 text-left transition active:bg-[var(--color-fill-secondary)]"
    >
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg">
        <ResilientImage
          src={imageUrl}
          alt=""
          fallback={imageFallback}
          className="h-full w-full object-cover"
        />
        {index != null && (
          <span className="absolute left-1 top-1 rounded bg-black/50 px-1.5 py-0.5 text-[10px] font-bold text-white">
            {index}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1 py-0.5">
        <div className="flex items-center gap-2">
          <h4 className="truncate font-serif text-[15px] font-bold text-[var(--color-label)]">
            {title}
          </h4>
          {isActive && (
            <span className="shrink-0 rounded-full bg-[#34C759]/15 px-2 py-0.5 text-[10px] font-semibold text-[#34C759]">
              Active
            </span>
          )}
        </div>
        {description && (
          <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-[var(--color-label-secondary)]">
            {description}
          </p>
        )}
      </div>
    </button>
  );
}
