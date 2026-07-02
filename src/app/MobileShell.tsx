import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BottomNav, BOTTOM_NAV_HEIGHT } from '@/components/ui/BottomNav';
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
    <div className="app-paper-bg relative mx-auto flex h-[100dvh] max-w-[430px] flex-col">
      {!isHome && (
        <PageHeader
          title={meta.title}
          subtitle={meta.subtitle}
          showBack={meta.showBack}
          onBack={handleBack}
          large={meta.large}
        />
      )}

      <main
        className="min-h-0 flex-1 overflow-hidden"
        style={{
          paddingBottom: isChatLike
            ? `calc(${BOTTOM_NAV_HEIGHT} + env(safe-area-inset-bottom, 0px))`
            : `calc(${BOTTOM_NAV_HEIGHT} + env(safe-area-inset-bottom, 0px))`,
        }}
      >
        <Outlet />
      </main>

      <BottomNav />
    </div>
  );
}

export { MAIN_TABS as TAB_ROUTES };
