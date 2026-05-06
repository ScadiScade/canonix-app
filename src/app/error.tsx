"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { Button, Illustration } from "@/components/ui";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Canonix Error]", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="mb-6">
        <Illustration name="error" width={200} height={200} />
      </div>
      <h1 className="font-serif text-[28px] md:text-[34px] font-light text-ink mb-3">
        Что-то пошло не так
      </h1>
      <p className="text-ink-2 text-[15px] md:text-[17px] max-w-md leading-relaxed mb-8">
        Произошла непредвиденная ошибка. Мы уже знаем о ней и работаем над исправлением.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={reset} variant="primary" icon={RefreshCw}>
          Попробовать снова
        </Button>
        <Button as="link" href="/" variant="secondary">
          На главную
        </Button>
      </div>
      {error.digest && (
        <p className="text-[12px] text-ink-3 mt-8 font-mono">
          ID ошибки: {error.digest}
        </p>
      )}
    </div>
  );
}
