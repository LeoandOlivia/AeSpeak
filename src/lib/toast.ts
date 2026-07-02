import { toast as sonnerToast } from 'sonner';

/** Consistent error toasts — visible above nav on mobile WebView */
export function showError(message: string, description?: string) {
  sonnerToast.error(message, {
    description,
    duration: 6000,
  });
}

export function ensureOnlineOrToast(): boolean {
  if (navigator.onLine) return true;
  showError('Network unavailable', 'Check your connection and try again');
  return false;
}
