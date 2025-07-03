// Global toast manager for non-React contexts
import { Toast } from "@/components/ui/toast";

type ToastEventData = Omit<Toast, "id">;

class ToastManager {
  private listeners: ((toast: ToastEventData) => void)[] = [];

  // Subscribe to toast events
  subscribe(listener: (toast: ToastEventData) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  // Emit toast event
  private emit(toast: ToastEventData) {
    this.listeners.forEach((listener) => listener(toast));
  }

  // Toast methods
  success(message: string, options?: { title?: string; duration?: number }) {
    this.emit({
      type: "success",
      message,
      title: options?.title,
      duration: options?.duration,
    });
  }

  error(message: string, options?: { title?: string; duration?: number }) {
    this.emit({
      type: "error",
      message,
      title: options?.title,
      duration: options?.duration || 5000,
    });
  }

  warning(message: string, options?: { title?: string; duration?: number }) {
    this.emit({
      type: "warning",
      message,
      title: options?.title,
      duration: options?.duration,
    });
  }

  warn(message: string, options?: { title?: string; duration?: number }) {
    this.warning(message, options);
  }

  info(message: string, options?: { title?: string; duration?: number }) {
    this.emit({
      type: "info",
      message,
      title: options?.title,
      duration: options?.duration,
    });
  }
}

// Export singleton instance
export const toastManager = new ToastManager();

// Export as default toast object for easy replacement of react-toastify
export const toast = {
  success: (message: string, options?: { title?: string; duration?: number }) =>
    toastManager.success(message, options),
  error: (message: string, options?: { title?: string; duration?: number }) =>
    toastManager.error(message, options),
  warning: (message: string, options?: { title?: string; duration?: number }) =>
    toastManager.warning(message, options),
  warn: (message: string, options?: { title?: string; duration?: number }) =>
    toastManager.warn(message, options),
  info: (message: string, options?: { title?: string; duration?: number }) =>
    toastManager.info(message, options),
};
