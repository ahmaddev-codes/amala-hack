"use client";

import React from "react";
import { useToast } from "@/contexts/ToastContext";
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

const toastIcons = {
  success: CheckCircleIcon,
  error: XCircleIcon,
  warning: ExclamationTriangleIcon,
  info: InformationCircleIcon,
};

const toastStyles = {
  success: "bg-green-50 border-green-200 text-green-800",
  error: "bg-red-50 border-red-200 text-red-800",
  warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
  info: "bg-blue-50 border-blue-200 text-blue-800",
};

const iconStyles = {
  success: "text-green-400",
  error: "text-red-400",
  warning: "text-yellow-400",
  info: "text-blue-400",
};

export function ToastContainer() {
  const { toasts, hideToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-2 max-w-sm w-full">
      {toasts.map((toast) => {
        const Icon = toastIcons[toast.type];
        
        return (
          <div
            key={toast.id}
            className={`
              ${toastStyles[toast.type]}
              border rounded-lg p-4 shadow-lg
              ${toast.isExiting ? 'animate-slide-out-right' : 'animate-slide-in-right'}
              flex items-start space-x-3
            `}
          >
            <Icon className={`w-5 h-5 ${iconStyles[toast.type]} flex-shrink-0 mt-0.5`} />
            
            <div className="flex-1 min-w-0">
              {toast.title && (
                <p className="text-sm font-medium">{toast.title}</p>
              )}
              <p className={`text-sm ${toast.title ? 'mt-1' : ''}`}>
                {toast.message}
              </p>
            </div>
            
            <button
              onClick={() => hideToast(toast.id)}
              className="flex-shrink-0 ml-4 inline-flex text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
