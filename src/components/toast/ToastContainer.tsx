"use client";

import React from "react";
import { useToast, Toast } from "@/contexts/ToastContext";
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react";

interface ToastItemProps {
  toast: Toast;
}

function ToastItem({ toast }: ToastItemProps) {
  const { hideToast } = useToast();
  const [isExiting, setIsExiting] = React.useState(false);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => hideToast(toast.id), 300); // Match animation duration
  };

  const getToastStyles = (type: Toast["type"]) => {
    switch (type) {
      case "success":
        return {
          bg: "bg-green-50 border-green-200",
          text: "text-green-800",
          icon: CheckCircle,
          iconColor: "text-green-500",
        };
      case "error":
        return {
          bg: "bg-red-50 border-red-200",
          text: "text-red-800",
          icon: AlertCircle,
          iconColor: "text-red-500",
        };
      case "warning":
        return {
          bg: "bg-yellow-50 border-yellow-200",
          text: "text-yellow-800",
          icon: AlertTriangle,
          iconColor: "text-yellow-500",
        };
      case "info":
        return {
          bg: "bg-blue-50 border-blue-200",
          text: "text-blue-800",
          icon: Info,
          iconColor: "text-blue-500",
        };
    }
  };

  const styles = getToastStyles(toast.type);
  const Icon = styles.icon;

  return (
    <div
      className={`${styles.bg} ${styles.text} border rounded-lg shadow-lg p-4 mb-3 min-w-[300px] max-w-[400px] transform transition-all duration-300 ease-in-out ${
        isExiting ? 'animate-slide-out-right' : 'animate-slide-in-right'
      }`}
    >
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 ${styles.iconColor} flex-shrink-0 mt-0.5`} />

        <div className="flex-1 min-w-0">
          {toast.title && (
            <h4 className="font-medium text-sm mb-1 truncate">{toast.title}</h4>
          )}
          <p className="text-sm leading-relaxed">{toast.message}</p>

          {toast.action && (
            <button
              onClick={toast.action.onClick}
              className="mt-2 text-sm font-medium text-primary hover:text-primary/80 underline"
            >
              {toast.action.label}
            </button>
          )}
        </div>

        <button
          onClick={handleClose}
          className={`${styles.iconColor} hover:opacity-70 transition-opacity flex-shrink-0`}
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function ToastContainer() {
  const { toasts } = useToast();

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
