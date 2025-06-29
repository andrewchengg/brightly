"use client";

import React, {
  createContext,
  useContext,
  useCallback,
  useState,
  useEffect,
} from "react";
import { cn } from "@/lib/utils";
import {
  FaCheck,
  FaTimes,
  FaExclamationTriangle,
  FaInfoCircle,
  FaTimesCircle,
} from "react-icons/fa";

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
  success: (
    message: string,
    options?: { title?: string; duration?: number }
  ) => void;
  error: (
    message: string,
    options?: { title?: string; duration?: number }
  ) => void;
  warning: (
    message: string,
    options?: { title?: string; duration?: number }
  ) => void;
  info: (
    message: string,
    options?: { title?: string; duration?: number }
  ) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

const toastVariants = {
  success: {
    container: "bg-green-50 border-green-200 text-green-800",
    icon: "text-green-600",
    IconComponent: FaCheck,
  },
  error: {
    container: "bg-red-50 border-red-200 text-red-800",
    icon: "text-red-600",
    IconComponent: FaTimesCircle,
  },
  warning: {
    container: "bg-amber-50 border-amber-200 text-amber-800",
    icon: "text-amber-600",
    IconComponent: FaExclamationTriangle,
  },
  info: {
    container: "bg-blue-50 border-blue-200 text-blue-800",
    icon: "text-blue-600",
    IconComponent: FaInfoCircle,
  },
};

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const variant = toastVariants[toast.type];
  const { IconComponent } = variant;

  useEffect(() => {
    // Animate in
    setTimeout(() => setIsVisible(true), 10);

    // Auto-remove after duration
    const duration = toast.duration ?? 4000;
    const timer = setTimeout(() => {
      handleRemove();
    }, duration);

    return () => clearTimeout(timer);
  }, []);

  const handleRemove = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onRemove(toast.id);
    }, 200);
  }, [toast.id, onRemove]);

  return (
    <div
      className={cn(
        "transform transition-all duration-200 ease-out",
        isVisible && !isExiting
          ? "translate-x-0 opacity-100 scale-100"
          : "translate-x-full opacity-0 scale-95",
        "max-w-sm w-full"
      )}
    >
      <div
        className={cn(
          "relative flex items-start p-4 rounded-lg border shadow-lg backdrop-blur-sm",
          "inter-font font-medium",
          variant.container
        )}
      >
        {/* Icon */}
        <div className={cn("flex-shrink-0 mr-3 mt-0.5", variant.icon)}>
          <IconComponent className="w-5 h-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {toast.title && (
            <p className="text-sm font-semibold mb-1">{toast.title}</p>
          )}
          <p className="text-sm leading-relaxed">{toast.message}</p>

          {/* Action Button */}
          {toast.action && (
            <button
              onClick={toast.action.onClick}
              className={cn(
                "mt-2 text-xs font-medium underline hover:no-underline transition-all",
                toast.type === "success"
                  ? "text-green-700 hover:text-green-800"
                  : toast.type === "error"
                  ? "text-red-700 hover:text-red-800"
                  : toast.type === "warning"
                  ? "text-amber-700 hover:text-amber-800"
                  : "text-blue-700 hover:text-blue-800"
              )}
            >
              {toast.action.label}
            </button>
          )}
        </div>

        {/* Close Button */}
        <button
          onClick={handleRemove}
          className={cn(
            "flex-shrink-0 ml-2 p-1 rounded-md transition-colors",
            "hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-offset-2",
            toast.type === "success"
              ? "focus:ring-green-500 text-green-500"
              : toast.type === "error"
              ? "focus:ring-red-500 text-red-500"
              : toast.type === "warning"
              ? "focus:ring-amber-500 text-amber-500"
              : "focus:ring-blue-500 text-blue-500"
          )}
        >
          <FaTimes className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onRemove,
}) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onRemove={onRemove} />
        </div>
      ))}
    </div>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: Toast = {
      id,
      duration: 4000,
      ...toast,
    };

    setToasts((prev) => [...prev, newToast]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  // Listen to global toast manager events
  useEffect(() => {
    const { toastManager } = require("@/lib/toast-manager");
    const unsubscribe = toastManager.subscribe(
      (toastData: Omit<Toast, "id">) => {
        addToast(toastData);
      }
    );

    return unsubscribe;
  }, [addToast]);

  const success = useCallback(
    (message: string, options?: { title?: string; duration?: number }) => {
      addToast({
        type: "success",
        message,
        title: options?.title,
        duration: options?.duration,
      });
    },
    [addToast]
  );

  const error = useCallback(
    (message: string, options?: { title?: string; duration?: number }) => {
      addToast({
        type: "error",
        message,
        title: options?.title,
        duration: options?.duration || 5000, // Errors stay longer
      });
    },
    [addToast]
  );

  const warning = useCallback(
    (message: string, options?: { title?: string; duration?: number }) => {
      addToast({
        type: "warning",
        message,
        title: options?.title,
        duration: options?.duration,
      });
    },
    [addToast]
  );

  const info = useCallback(
    (message: string, options?: { title?: string; duration?: number }) => {
      addToast({
        type: "info",
        message,
        title: options?.title,
        duration: options?.duration,
      });
    },
    [addToast]
  );

  const contextValue: ToastContextType = {
    addToast,
    removeToast,
    success,
    error,
    warning,
    info,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

// Legacy compatibility - you can create these functions to easily replace react-toastify
export const toast = {
  success: (
    message: string,
    options?: { title?: string; duration?: number }
  ) => {
    // This is a placeholder - in practice, you'd need to ensure the provider is available
    console.warn(
      "toast.success called outside of ToastProvider context. Use useToast() hook instead."
    );
  },
  error: (message: string, options?: { title?: string; duration?: number }) => {
    console.warn(
      "toast.error called outside of ToastProvider context. Use useToast() hook instead."
    );
  },
  warning: (
    message: string,
    options?: { title?: string; duration?: number }
  ) => {
    console.warn(
      "toast.warning called outside of ToastProvider context. Use useToast() hook instead."
    );
  },
  warn: (message: string, options?: { title?: string; duration?: number }) => {
    console.warn(
      "toast.warn called outside of ToastProvider context. Use useToast() hook instead."
    );
  },
  info: (message: string, options?: { title?: string; duration?: number }) => {
    console.warn(
      "toast.info called outside of ToastProvider context. Use useToast() hook instead."
    );
  },
};
