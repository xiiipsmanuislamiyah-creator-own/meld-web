import React, { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle, Info, WarningCircle } from "@phosphor-icons/react";

export type ToastTone = "success" | "error" | "info";

interface ToastEntry {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  notify: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastSeq = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);

  const notify = useCallback((message: string, tone: ToastTone = "info") => {
    const id = toastSeq++;
    setToasts((prev) => [...prev.slice(-2), { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3400);
  }, []);

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite" aria-atomic="true">
        {toasts.map((t) => (
          <div key={t.id} className="toast-item">
            {t.tone === "success" && (
              <CheckCircle size={18} weight="fill" style={{ color: "var(--status-success)", flexShrink: 0 }} />
            )}
            {t.tone === "error" && (
              <WarningCircle size={18} weight="fill" style={{ color: "var(--status-error)", flexShrink: 0 }} />
            )}
            {t.tone === "info" && (
              <Info size={18} weight="fill" style={{ color: "var(--dock-accent)", flexShrink: 0 }} />
            )}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
