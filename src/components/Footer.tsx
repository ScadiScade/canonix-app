"use client";

import Link from "next/link";
import { Map } from "lucide-react";
import { useLocale } from "@/lib/i18n";

export function Footer() {
  const { t } = useLocale();
  return (
    <footer className="border-t border-ink-3/10 bg-surface mt-auto">
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="inline-flex items-center gap-1.5 no-underline">
              <Map size={10} className="text-accent" />
              <span className="font-serif text-[14px] font-light text-ink">Canonix</span>
            </Link>
            <p className="text-[12px] text-ink-3 hidden sm:block">{t("landing.footerDesc")}</p>
          </div>
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-1" aria-label="Footer">
            <Link href="/marketplace" className="text-[12px] tracking-[0.05em] uppercase text-ink-3 hover:text-accent transition-colors no-underline">{t("landing.marketplace")}</Link>
            <Link href="/legal/terms" className="text-[12px] tracking-[0.05em] uppercase text-ink-3 hover:text-accent transition-colors no-underline">{t("landing.termsOfUse")}</Link>
            <Link href="/legal/privacy" className="text-[12px] tracking-[0.05em] uppercase text-ink-3 hover:text-accent transition-colors no-underline">{t("login.privacy")}</Link>
            <Link href="/legal/consent" className="text-[12px] tracking-[0.05em] uppercase text-ink-3 hover:text-accent transition-colors no-underline">{t("landing.dataProcessing")}</Link>
          </nav>
        </div>
        <div className="mt-3 pt-2 border-t border-ink-3/8 flex items-center justify-between gap-2">
          <span className="text-[11px] tracking-[0.15em] uppercase text-ink-3">canonix · {new Date().getFullYear()}</span>
          <span className="text-[11px] text-ink-3">{t("landing.madeWith")}</span>
        </div>
      </div>
    </footer>
  );
}
