import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/', label: '练习', icon: PracticeIcon, end: true },
  { to: '/history', label: '历史', icon: HistoryIcon, end: false },
  { to: '/review', label: '复习', icon: ReviewIcon, end: false },
  { to: '/settings', label: '设置', icon: SettingsIcon, end: false },
] as const;

const ACTIVE = '#007AFF';
const INACTIVE = 'rgba(60,60,67,0.6)';

export function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-1/2 z-50 w-full max-w-[430px] -translate-x-1/2 border-t border-[var(--color-separator)] bg-[var(--color-bg-elevated)] backdrop-blur-xl"
      style={{ paddingBottom: 'max(0.25rem, env(safe-area-inset-bottom))' }}
    >
      <div className="flex">
        {TABS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className="flex flex-1 flex-col items-center gap-0.5 py-1.5"
          >
            {({ isActive }) => (
              <>
                <Icon active={isActive} />
                <span
                  className="text-[10px] font-medium"
                  style={{ color: isActive ? ACTIVE : INACTIVE }}
                >
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

function PracticeIcon({ active }: { active: boolean }) {
  const c = active ? ACTIVE : INACTIVE;
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        stroke={c}
        strokeWidth={active ? 2.2 : 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HistoryIcon({ active }: { active: boolean }) {
  const c = active ? ACTIVE : INACTIVE;
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 8v4l3 3M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        stroke={c}
        strokeWidth={active ? 2.2 : 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ReviewIcon({ active }: { active: boolean }) {
  const c = active ? ACTIVE : INACTIVE;
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        stroke={c}
        strokeWidth={active ? 2.2 : 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SettingsIcon({ active }: { active: boolean }) {
  const c = active ? ACTIVE : INACTIVE;
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="3" stroke={c} strokeWidth={active ? 2.2 : 1.8} />
      <path
        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
        stroke={c}
        strokeWidth={active ? 2 : 1.6}
        strokeLinecap="round"
      />
    </svg>
  );
}

export const BOTTOM_NAV_HEIGHT = '3.5rem';
