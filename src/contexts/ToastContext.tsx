"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from "react";

export interface Toast {
  id: string;
  title?: string;
  message: string;
  type: "success" | "error" | "warning" | "info";
  duration?: number;
  isExiting?: boolean;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (toast: Omit<Toast, "id">) => void;
  hideToast: (id: string) => void;
  clearAllToasts: () => void;
  success: (message: string, title?: string, duration?: number) => void;
  error: (message: string, title?: string, duration?: number) => void;
  warning: (message: string, title?: string, duration?: number) => void;
  info: (message: string, title?: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const hideToast = useCallback((id: string) => {
    // Clear any existing timeout
    const existingTimeout = timeoutRefs.current.get(id);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      timeoutRefs.current.delete(id);
    }

    // Start exit animation
    setToasts((prev) => 
      prev.map((toast) => 
        toast.id === id ? { ...toast, isExiting: true } : toast
      )
    );

    // Remove from DOM after animation completes
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 300); // Match animation duration
  }, []);

  const showToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const duration = toast.duration || (toast.type === 'error' ? 8000 : 6000);
    
    const newToast: Toast = {
      id,
      duration,
      isExiting: false,
      ...toast,
    };

    setToasts((prev) => [...prev, newToast]);

    // Auto-remove after duration
    const timeoutId = setTimeout(() => {
      hideToast(id);
    }, duration);
    
    timeoutRefs.current.set(id, timeoutId);
  }, [hideToast]);

  const clearAllToasts = useCallback(() => {
    // Clear all timeouts
    timeoutRefs.current.forEach((timeout) => clearTimeout(timeout));
    timeoutRefs.current.clear();
    setToasts([]);
  }, []);

  const success = useCallback(
    (message: string, title?: string, duration?: number) => {
      showToast({ message, title, type: "success", duration });
    },
    [showToast]
  );

  const error = useCallback(
    (message: string, title?: string, duration?: number) => {
      showToast({ message, title, type: "error", duration });
    },
    [showToast]
  );

  const warning = useCallback(
    (message: string, title?: string, duration?: number) => {
      showToast({ message, title, type: "warning", duration });
    },
    [showToast]
  );

  const info = useCallback(
    (message: string, title?: string, duration?: number) => {
      showToast({ message, title, type: "info", duration });
    },
    [showToast]
  );

  return (
    <ToastContext.Provider
      value={{
        toasts,
        showToast,
        hideToast,
        clearAllToasts,
        success,
        error,
        warning,
        info,
      }}
    >
      {children}
    </ToastContext.Provider>
  );
}
