"use client";

import { Button, Illustration } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="relative mb-6">
        <Illustration name="search" width={200} height={200} />
        <span className="absolute top-0 right-0 bg-surface border border-ink-3/10 rounded-full w-10 h-10 flex items-center justify-center font-serif text-[18px] text-ink-3">
          404
        </span>
      </div>
      <h1 className="font-serif text-[28px] md:text-[34px] font-light text-ink mb-3">
        Страница не найдена
      </h1>
      <p className="text-ink-2 text-[15px] md:text-[17px] max-w-md leading-relaxed mb-8">
        Возможно, она была перемещена или удалена. Попробуйте вернуться на главную или воспользоваться поиском.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Button as="link" href="/" variant="primary">
          На главную
        </Button>
        <Button as="link" href="/marketplace" variant="secondary">
          Маркетплейс
        </Button>
      </div>
    </div>
  );
}
