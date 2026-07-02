import { createBrowserRouter, Navigate } from 'react-router-dom';
import { MobileShell } from '@/app/MobileShell';
import { CategoryPage } from '@/pages/CategoryPage';
import { ChatPage } from '@/pages/ChatPage';
import { HistoryPage } from '@/pages/HistoryPage';
import { HomePage } from '@/pages/HomePage';
import { ReviewPage } from '@/pages/ReviewPage';
import { ReviewSessionPage } from '@/pages/ReviewSessionPage';
import { SettingsPage } from '@/pages/SettingsPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MobileShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'scene/:category', element: <CategoryPage /> },
      { path: 'chat/:conversationId', element: <ChatPage /> },
      { path: 'history', element: <HistoryPage /> },
      { path: 'review', element: <ReviewPage /> },
      { path: 'review/session/:reviewCardId', element: <ReviewSessionPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
