"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Map, ShoppingBag, CreditCard, Users, Coins, Settings,
  Menu, X, LogIn, LogOut, Languages, Sun, Moon, Monitor,
} from "lucide-react";
import { useCredits } from "@/components/CreditProvider";
import { useLocale } from "@/lib/i18n";
import { useThemeContext } from "@/components/ThemeProvider";
import Image from "next/image";
import { LOCALE_NAMES, LOCALE_FLAGS } from "@/lib/i18n/types";
import type { Locale } from "@/lib/i18n/types";
import { signOut } from "next-auth/react";

export default function Topbar({ universeName, universeSlug }: { universeName?: string; universeSlug?: string }) {
  const { data: session } = useSession();
  const { balance } = useCredits();
  const { locale, setLocale, t } = useLocale();
  const { theme, resolved, setTheme } = useThemeContext();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [langMenu, setLangMenu] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  // Click-outside to close language dropdown
  useEffect(() => {
    if (!langMenu) return;
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [langMenu]);

  // Escape to close mobile menu
  useEffect(() => {
    if (!mobileOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [mobileOpen]);

  const switchLocale = (l: Locale) => { setLocale(l); setLangMenu(false); };

  const navLinks = [
    { href: "/marketplace", label: t("topbar.marketplace"), icon: ShoppingBag },
    { href: "/pricing", label: t("topbar.pricing"), icon: CreditCard },
    { href: "/team", label: t("topbar.team"), icon: Users, requireAuth: true },
  ];

  const userInitial = session?.user?.name?.[0]?.toUpperCase() || session?.user?.email?.[0]?.toUpperCase() || "?";

  return (
    <>
      <header className="fixed top-0 left-0 right-0 h-topbar bg-surface/80 backdrop-blur-md border-b border-ink-3/10 z-50 will-change-[transform]" style={{ backfaceVisibility: 'hidden' }}>
        <div className="h-full max-w-[1400px] mx-auto px-4 md:px-7 flex items-center justify-between">
          {/* Left: Logo + breadcrumb */}
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/" className="flex items-center gap-2 no-underline shrink-0">
              <Map size={20} className="text-accent" />
              <span className="font-serif text-[20px] font-light text-ink tracking-tight">Canonix</span>
            </Link>
            {universeName && universeSlug && (
              <>
                <span className="text-ink-3/30 text-[16px]">/</span>
                <Link
                  href={`/u/${universeSlug}`}
                  className="font-serif text-[19px] font-light text-ink-2 hover:text-accent transition-colors no-underline truncate max-w-[200px]"
                >
                  {universeName}
                </Link>
              </>
            )}
          </div>

          {/* Center: Nav links (desktop) */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
            {navLinks.map(link => {
              const hidden = link.requireAuth && !session;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-hidden={hidden}
                  tabIndex={hidden ? -1 : 0}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[17px] tracking-[0.08em] uppercase text-ink-3 hover:text-ink hover:bg-ink-3/5 transition-all no-underline${hidden ? " pointer-events-none opacity-0" : ""}`}
                >
                  <link.icon size={13} />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right: User actions */}
          <div className="flex items-center gap-2 min-w-0">
            {/* Theme toggle */}
            <button
              onClick={() => {
                const next = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
                setTheme(next);
              }}
              aria-label={theme === "light" ? t("topbar.darkTheme") : theme === "dark" ? t("topbar.systemTheme") : t("topbar.lightTheme")}
              title={theme === "system" ? t("topbar.systemTheme") : resolved === "dark" ? t("topbar.lightTheme") : t("topbar.darkTheme")}
              className="flex items-center justify-center w-8 h-8 rounded-md text-ink-3 hover:text-ink hover:bg-ink-3/5 transition-all"
            >
              {theme === "system" ? <Monitor size={15} /> : resolved === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {/* Language switcher */}
            <div ref={langRef} className="relative">
              <button
                onClick={() => setLangMenu(!langMenu)}
                aria-label={t("topbar.language")}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[17px] text-ink-3 hover:text-ink hover:bg-ink-3/5 transition-all"
              >
                <Languages size={13} />
                <span className="hidden sm:inline">{LOCALE_FLAGS[locale]} {locale.toUpperCase()}</span>
              </button>
              {langMenu && (
                <div className="absolute right-0 top-full mt-1 bg-surface border border-ink-3/15 rounded-lg shadow-lg overflow-hidden z-50 min-w-[140px]" style={{ animation: "scaleIn 0.1s ease-out" }}>
                  {(["ru", "en"] as Locale[]).map(l => (
                    <button
                      key={l}
                      onClick={() => switchLocale(l)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-[18px] hover:bg-ink-3/5 transition-colors ${locale === l ? "text-accent font-medium" : "text-ink-2"}`}
                    >
                      {LOCALE_FLAGS[l]} {LOCALE_NAMES[l]}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Credit badge — always reserve space on sm+ */}
            <Link
              href="/pricing"
              className={`hidden sm:flex items-center gap-1.5 rounded-full px-3 py-1 no-underline transition-colors ${session && balance !== null ? "bg-accent/8 hover:bg-accent/15 border border-accent/15" : "pointer-events-none opacity-0"}`}
              tabIndex={session && balance !== null ? 0 : -1}
              aria-hidden={!session || balance === null}
            >
              <Coins size={12} className="text-accent" />
              <span className="text-[17px] font-medium text-accent">{balance ?? 0}</span>
              <span className="text-[15px] text-accent/60">{t("common.credits")}</span>
            </Link>

            {/* User area — always reserve avatar-sized space to prevent shift */}
            <div className="flex items-center gap-2 shrink-0">
              {session ? (
                <>
                  {/* Settings (desktop) */}
                  <Link
                    href="/settings"
                    className="hidden md:flex items-center justify-center w-8 h-8 rounded-md text-ink-3 hover:text-ink hover:bg-ink-3/5 transition-all no-underline"
                    title={t("topbar.settings")}
                  >
                    <Settings size={15} />
                  </Link>

                  {/* User avatar */}
                  <Link
                    href="/dashboard"
                    aria-label={t("topbar.profile")}
                    className="flex items-center gap-2 no-underline group"
                  >
                    {session.user?.image ? (
                      <Image
                        src={session.user.image}
                        alt=""
                        width={28}
                        height={28}
                        className="w-7 h-7 rounded-full object-cover border border-ink-3/10 group-hover:border-accent/30 transition-colors"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-accent/10 border border-accent/15 flex items-center justify-center text-[17px] font-medium text-accent group-hover:bg-accent/20 transition-colors">
                        {userInitial}
                      </div>
                    )}
                    <span className="hidden lg:block text-[18px] text-ink-2 group-hover:text-ink transition-colors truncate max-w-[120px]">
                      {session.user?.name || session.user?.email?.split("@")[0]}
                    </span>
                  </Link>
                </>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center gap-1.5 bg-accent text-white rounded-lg px-4 py-1.5 text-[17px] tracking-[0.05em] uppercase hover:bg-accent/90 transition-colors no-underline"
                >
                  <LogIn size={12} />
                  {t("topbar.login")}
                </Link>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? t("common.close") : t("topbar.menu")}
              className="md:hidden flex items-center justify-center w-8 h-8 rounded-md text-ink-3 hover:text-ink hover:bg-ink-3/5 transition-all"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden" style={{ animation: "fadeIn 0.15s ease-out" }}>
          <div className="absolute inset-0 bg-ink/20 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute top-topbar right-0 w-64 bg-surface border-l border-b border-ink-3/10 shadow-lg" style={{ animation: "slideRight 0.2s ease-out" }}>
            <nav className="p-3 space-y-1" aria-label="Mobile navigation">
              {navLinks.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[19px] text-ink-2 hover:text-ink hover:bg-ink-3/5 transition-all no-underline"
                >
                  <link.icon size={16} className="text-ink-3" />
                  {link.label}
                </Link>
              ))}

              {/* Language in mobile */}
              <div className="border-t border-ink-3/10 my-2" />
              <div className="flex gap-1 px-3 py-1">
                {(["ru", "en"] as Locale[]).map(l => (
                  <button
                    key={l}
                    onClick={() => { switchLocale(l); setMobileOpen(false); }}
                    className={`flex-1 py-1.5 rounded-md text-[17px] transition-colors ${locale === l ? "bg-accent text-white" : "bg-background text-ink-2 hover:text-ink"}`}
                  >
                    {LOCALE_FLAGS[l]} {l.toUpperCase()}
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  const next = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
                  setTheme(next);
                  setMobileOpen(false);
                }}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[19px] text-ink-2 hover:text-ink hover:bg-ink-3/5 transition-all w-full text-left"
              >
                {theme === "system" ? <Monitor size={16} className="text-ink-3" /> : resolved === "dark" ? <Sun size={16} className="text-ink-3" /> : <Moon size={16} className="text-ink-3" />}
                {theme === "system" ? t("topbar.systemTheme") : resolved === "dark" ? t("topbar.lightTheme") : t("topbar.darkTheme")}
              </button>

              {session && balance !== null && (
                <Link
                  href="/pricing"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[19px] text-accent hover:bg-accent/5 transition-all no-underline"
                >
                  <Coins size={16} />
                  {balance} {t("common.credits")}
                </Link>
              )}

              {session && (
                <>
                  <div className="border-t border-ink-3/10 my-2" />
                  <Link
                    href="/settings"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[19px] text-ink-2 hover:text-ink hover:bg-ink-3/5 transition-all no-underline"
                  >
                    <Settings size={16} className="text-ink-3" />
                    {t("topbar.settings")}
                  </Link>
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[19px] text-ink-2 hover:text-ink hover:bg-ink-3/5 transition-all no-underline"
                  >
                    <div className="w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center text-[15px] font-medium text-accent">
                      {userInitial}
                    </div>
                    {t("topbar.profile")}
                  </Link>
                  <button
                    onClick={() => { setMobileOpen(false); signOut(); }}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[19px] text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all w-full text-left"
                  >
                    <LogOut size={16} />
                    {t("topbar.logout")}
                  </button>
                </>
              )}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
