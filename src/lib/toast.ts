import { toast as sonnerToast } from 'sonner';

/** Consistent error toasts — visible above nav on mobile WebView */
export function showError(message: string, description?: string) {
  sonnerToast.error(message, {
    description,
    duration: 6000,
  });
}

export function showSuccess(message: string, description?: string) {
  sonnerToast.success(message, {
    description,
    duration: 4000,
  });
}

export function showMessage(message: string, description?: string) {
  sonnerToast.message(message, {
    description,
    duration: 4000,
  });
}
