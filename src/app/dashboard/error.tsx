"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Dashboard Error]", error);
  }, [error]);

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-7 py-12 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-5">
        <AlertTriangle size={28} className="text-red-500" />
      </div>
      <h2 className="font-serif text-[24px] font-light text-ink mb-2">
        Ошибка загрузки дашборда
      </h2>
      <p className="text-ink-2 text-[15px] max-w-md mx-auto mb-6">
        Не удалось загрузить ваши вселенные. Попробуйте обновить страницу.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button onClick={reset} variant="primary" icon={RefreshCw}>
          Обновить
        </Button>
        <Button as="link" href="/" variant="secondary">
          На главную
        </Button>
      </div>
    </div>
  );
}
