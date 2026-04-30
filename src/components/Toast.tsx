"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";
import { useLocale } from "@/lib/i18n";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useLocale();
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = "success") => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const remove = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const icons = { success: CheckCircle, error: AlertCircle, info: Info };
  const colors = {
    success: "bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300",
    error: "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300",
    info: "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300",
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
        {toasts.map(item => {
          const Icon = icons[item.type];
          return (
            <div
              key={item.id}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg border shadow-lg text-[18px] animate-in ${colors[item.type]}`}
              style={{ animation: "slideIn 0.2s ease-out" }}
              role={item.type === "error" ? "alert" : "status"}
              aria-live={item.type === "error" ? "assertive" : "polite"}
            >
              <Icon size={14} className="flex-shrink-0" />
              <span className="flex-1">{item.message}</span>
              <button onClick={() => remove(item.id)} className="p-0.5 hover:opacity-70" aria-label={t("common.close")}>
                <X size={12} />
              </button>
            </div>
          );
        })}
      </div>
      <style jsx>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </ToastContext.Provider>
  );
}
