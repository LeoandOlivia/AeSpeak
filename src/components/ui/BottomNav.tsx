import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/', label: 'Practice', icon: PracticeIcon, end: true },
  { to: '/history', label: 'History', icon: HistoryIcon, end: false },
  { to: '/review', label: 'Review', icon: ReviewIcon, end: false },
  { to: '/settings', label: 'Settings', icon: SettingsIcon, end: false },
] as const;

const ACTIVE = 'var(--color-ink)';
const INACTIVE = 'var(--color-label-secondary)';

export function BottomNav() {
  return (
    <nav
      className="newspaper-nav"
      style={{ paddingBottom: 'max(0.35rem, env(safe-area-inset-bottom, 0px))' }}
      aria-label="Main navigation"
    >
      <div className="flex w-full">
        {TABS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `newspaper-nav-link flex min-w-0 flex-1 flex-col items-center gap-0.5 px-0.5 pb-1.5 pt-2${
                isActive ? ' newspaper-nav-link-active' : ''
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon active={isActive} />
                <span
                  className="w-full truncate text-center font-serif text-[9px] font-bold uppercase tracking-[0.06em]"
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
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 19.5A2.5 2.5 0 016.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"
        stroke={c}
        strokeWidth={active ? 2 : 1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 7h8M8 11h5"
        stroke={c}
        strokeWidth={active ? 1.8 : 1.5}
        strokeLinecap="round"
      />
    </svg>
  );
}

function HistoryIcon({ active }: { active: boolean }) {
  const c = active ? ACTIVE : INACTIVE;
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 8v4l3 3M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        stroke={c}
        strokeWidth={active ? 2 : 1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ReviewIcon({ active }: { active: boolean }) {
  const c = active ? ACTIVE : INACTIVE;
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        stroke={c}
        strokeWidth={active ? 2 : 1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SettingsIcon({ active }: { active: boolean }) {
  const c = active ? ACTIVE : INACTIVE;
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="3" stroke={c} strokeWidth={active ? 2 : 1.6} />
      <path
        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
        stroke={c}
        strokeWidth={active ? 1.8 : 1.5}
        strokeLinecap="round"
      />
    </svg>
  );
}

export const BOTTOM_NAV_HEIGHT = 'var(--bottom-nav-height)';
