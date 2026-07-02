import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/ui/BottomNav';
import { PageHeader } from '@/components/ui/PageHeader';
import { CATEGORY_LABELS, type ScenarioCategory } from '@/types';

const MAIN_TABS = ['/', '/history', '/review', '/settings'] as const;

function getPageMeta(
  pathname: string,
  navFrom?: string,
): {
  title: string;
  subtitle?: string;
  showBack: boolean;
  backTo?: string;
  large?: boolean;
} {
  if (pathname === '/') {
    return { title: 'Practice', showBack: false, large: true };
  }
  if (pathname === '/history') {
    return { title: 'History', showBack: false, large: true };
  }
  if (pathname === '/review') {
    return { title: 'Review', showBack: false, large: true };
  }
  if (pathname === '/settings') {
    return { title: 'Settings', showBack: false, large: true };
  }
  if (pathname.startsWith('/scene/')) {
    const cat = pathname.replace('/scene/', '') as ScenarioCategory;
    return {
      title: CATEGORY_LABELS[cat] ?? 'Section',
      showBack: true,
      backTo: '/',
    };
  }
  if (pathname.startsWith('/chat/')) {
    return {
      title: 'Conversation',
      showBack: true,
      backTo: navFrom ?? '/',
    };
  }
  if (pathname.startsWith('/review/session/')) {
    return { title: 'Review', showBack: true, backTo: '/review' };
  }
  return { title: 'eSpeak', showBack: true, backTo: '/' };
}

export function MobileShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const navState = location.state as { from?: string } | null;
  const meta = getPageMeta(location.pathname, navState?.from);
  const isChatLike =
    location.pathname.startsWith('/chat/') ||
    location.pathname.startsWith('/review/session/');
  const isHome = location.pathname === '/';

  const handleBack = () => {
    if (meta.backTo) {
      navigate(meta.backTo);
      return;
    }
    navigate(-1);
  };

  return (
    <div
      className="app-shell app-paper-bg fixed inset-y-0 z-0 flex w-full max-w-[430px] flex-col"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      {!isHome && (
        <PageHeader
          title={meta.title}
          subtitle={meta.subtitle}
          showBack={meta.showBack}
          onBack={handleBack}
          large={meta.large}
        />
      )}

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {isChatLike ? (
          <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
            <Outlet />
          </div>
        ) : (
          <div className="scroll-area min-h-0 flex-1 overscroll-contain">
            <Outlet />
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

export { MAIN_TABS as TAB_ROUTES };
