"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle, X } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { useModalBehavior } from "@/lib/useModalBehavior";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useLocale();
  useModalBehavior(open, onCancel);
  const confirmLabelResolved = confirmLabel || t("common.delete");
  const cancelLabelResolved = cancelLabel || t("common.cancel");
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) confirmRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-ink/60 dark:bg-white/30 z-50 flex items-center justify-center p-4"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="bg-surface rounded-xl border border-ink-3/15 shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={e => e.stopPropagation()}
        style={{ animation: "scaleIn 0.2s var(--ease-spring)", transformOrigin: "center center" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${destructive ? "bg-red-100 dark:bg-red-900/40" : "bg-accent-light"}`}>
              <AlertTriangle size={16} className={destructive ? "text-red-500" : "text-accent"} />
            </div>
            <h3 className="font-serif text-[22px] font-light text-ink">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            aria-label={t("common.close")}
            className="p-1 rounded-md hover:bg-ink-3/10 text-ink-3 hover:text-ink transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Message */}
        <div className="px-5 pb-4">
          <p className="text-[18px] text-ink-2 leading-relaxed">{message}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-5 pb-5">
          <button
            onClick={onConfirm}
            ref={confirmRef}
            className={`flex-1 py-2 rounded-lg text-[17px] tracking-[0.08em] uppercase transition-colors ${
              destructive
                ? "bg-red-500 text-white hover:bg-red-600"
                : "bg-accent text-white hover:bg-accent/90"
            }`}
          >
            {confirmLabelResolved}
          </button>
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-lg text-[17px] tracking-[0.08em] uppercase bg-background border border-ink-3/15 text-ink-2 hover:text-ink hover:bg-ink-3/5 transition-colors"
          >
            {cancelLabelResolved}
          </button>
        </div>
      </div>
    </div>
  );
}
