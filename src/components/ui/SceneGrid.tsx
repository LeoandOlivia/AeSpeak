import type { ReactNode } from 'react';

interface SceneTileProps {
  emoji: string;
  label: string;
  iconBg: string;
  onClick?: () => void;
  badge?: ReactNode;
}

export function SceneTile({ emoji, label, iconBg, onClick, badge }: SceneTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-2 rounded-2xl p-3 transition active:scale-95"
    >
      <div className="relative">
        <div
          className="flex h-[60px] w-[60px] items-center justify-center rounded-[14px] text-[28px] shadow-md"
          style={{ background: iconBg }}
        >
          {emoji}
        </div>
        {badge}
      </div>
      <span className="max-w-[88px] text-center text-[13px] font-medium leading-tight text-[var(--color-label)]">
        {label}
      </span>
    </button>
  );
}

interface SceneGridProps {
  children: ReactNode;
}

export function SceneGrid({ children }: SceneGridProps) {
  return (
    <div className="grid grid-cols-3 gap-x-2 gap-y-4 px-4 py-2">{children}</div>
  );
}
