"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Map, ShoppingBag, CreditCard, Coins, Settings, Wallet, Users,
  Menu, X, LogIn, LogOut, Sun, Moon, Monitor,
  ChevronDown,
} from "lucide-react";
import { useCredits } from "@/components/CreditProvider";
import { useLocale } from "@/lib/i18n";
import { useThemeContext } from "@/components/ThemeProvider";
import Image from "next/image";
import { LOCALE_FLAGS } from "@/lib/i18n/types";
import type { Locale } from "@/lib/i18n/types";

export default function Topbar({ universeName, universeSlug }: { universeName?: string; universeSlug?: string }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { balance } = useCredits();
  const { locale, setLocale, t } = useLocale();
  const { theme, resolved, setTheme } = useThemeContext();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Click-outside to close user menu
  useEffect(() => {
    if (!userMenu) return;
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [userMenu]);

  // Escape to close mobile menu
  useEffect(() => {
    if (!mobileOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [mobileOpen]);

  // Close menus on route change
  useEffect(() => {
    setMobileOpen(false);
    setUserMenu(false);
  }, [pathname]);

  const switchLocale = (l: Locale) => { setLocale(l); };

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  // Core nav — only 3 items, always visible
  const coreNav = [
    { href: "/dashboard", label: t("topbar.universes"), icon: Map, auth: true },
    { href: "/marketplace", label: t("topbar.marketplace"), icon: ShoppingBag },
    { href: "/pricing", label: t("topbar.pricing"), icon: CreditCard },
  ];

  const userInitial = session?.user?.name?.[0]?.toUpperCase() || session?.user?.email?.[0]?.toUpperCase() || "?";

  return (
    <>
      <header className="fixed top-0 left-0 right-0 h-topbar bg-surface/80 backdrop-blur-md border-b border-ink-3/10 z-50">
        <div className="h-full max-w-[1400px] mx-auto px-4 md:px-7 flex items-center justify-between gap-4">
          {/* Left: Logo + breadcrumb */}
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/" className="flex items-center gap-2 no-underline shrink-0 group hover-glow rounded-lg px-1.5 py-0.5 -ml-1.5">
              <Map size={20} className="text-accent transition-transform duration-300 group-hover:scale-110 group-hover:rotate-[8deg]" />
              <span className="font-serif text-[20px] sm:text-[20px] font-light text-ink tracking-tight group-hover:text-accent transition-colors duration-300">Canonix</span>
            </Link>
            {universeName && universeSlug && (
              <>
                <span className="text-ink-3/30 text-[16px]">/</span>
                <Link
                  href={`/u/${universeSlug}`}
                  className="font-serif text-[15px] sm:text-[19px] font-light text-ink-2 hover:text-accent transition-colors no-underline truncate max-w-[120px] sm:max-w-[200px]"
                >
                  {universeName}
                </Link>
              </>
            )}
          </div>

          {/* Center: Core nav (desktop) */}
          <nav className="hidden md:flex items-center gap-0.5" aria-label="Main navigation">
            {coreNav.map(link => {
              const hidden = link.auth && !session;
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-hidden={hidden}
                  tabIndex={hidden ? -1 : 0}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[14px] tracking-[0.06em] uppercase transition-all no-underline ${
                    active
                      ? "text-accent bg-accent/8 font-medium"
                      : "text-ink-3 hover:text-ink hover:bg-ink-3/5"
                  }${hidden ? " pointer-events-none opacity-0" : ""}`}
                >
                  <link.icon size={14} className={active ? "text-accent" : ""} />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right: Credits + User */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Credit pill */}
            {session && balance !== null && (
              <Link
                href="/wallet"
                className="flex items-center gap-1 rounded-full pl-2 pr-2.5 sm:pl-2.5 sm:pr-3 py-1 no-underline transition-colors bg-accent/8 hover:bg-accent/15 border border-accent/12"
              >
                <Coins size={12} className="text-accent" />
                <span className="text-[13px] sm:text-[14px] font-medium text-accent">{balance}</span>
              </Link>
            )}

            {/* User menu */}
            {session ? (
              <div ref={userMenuRef} className="relative">
                <button
                  onClick={() => setUserMenu(!userMenu)}
                  className="flex items-center gap-1.5 rounded-lg px-1.5 py-1 hover:bg-ink-3/5 transition-all btn-press"
                >
                  {session.user?.image ? (
                    <Image src={session.user.image} alt="" width={28} height={28} className="w-7 h-7 rounded-full object-cover border border-ink-3/10" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-accent/10 border border-accent/15 flex items-center justify-center text-[14px] font-medium text-accent">{userInitial}</div>
                  )}
                  <ChevronDown size={12} className={`text-ink-3 transition-transform duration-150 ${userMenu ? "rotate-180" : ""}`} />
                </button>

                {userMenu && (
                  <div className="absolute right-0 top-full mt-1.5 bg-surface border border-ink-3/12 rounded-xl shadow-xl overflow-hidden z-50 min-w-[220px]" style={{ animation: "scaleIn 0.2s var(--ease-spring)", transformOrigin: "top right" }}>
                    {/* User info */}
                    <div className="px-4 py-3 border-b border-ink-3/8">
                      <p className="text-[15px] text-ink font-medium truncate">{session.user?.name || session.user?.email?.split("@")[0]}</p>
                      <p className="text-[13px] text-ink-3 truncate">{session.user?.email}</p>
                    </div>

                    {/* Navigation */}
                    <div className="py-1">
                      <Link href="/dashboard" onClick={() => setUserMenu(false)} className={`w-full flex items-center gap-3 px-4 py-2 text-[14px] hover:bg-ink-3/5 transition-colors no-underline ${isActive("/dashboard") ? "text-accent" : "text-ink-2"}`}>
                        <Map size={15} />{t("topbar.universes")}
                      </Link>
                      <Link href="/wallet" onClick={() => setUserMenu(false)} className={`w-full flex items-center gap-3 px-4 py-2 text-[14px] hover:bg-ink-3/5 transition-colors no-underline ${isActive("/wallet") ? "text-accent" : "text-ink-2"}`}>
                        <Wallet size={15} />{t("topbar.wallet")}
                      </Link>
                      <Link href="/team" onClick={() => setUserMenu(false)} className={`w-full flex items-center gap-3 px-4 py-2 text-[14px] hover:bg-ink-3/5 transition-colors no-underline ${isActive("/team") ? "text-accent" : "text-ink-2"}`}>
                        <Users size={15} />{t("topbar.team")}
                      </Link>
                      <Link href="/settings" onClick={() => setUserMenu(false)} className={`w-full flex items-center gap-3 px-4 py-2 text-[14px] hover:bg-ink-3/5 transition-colors no-underline ${isActive("/settings") ? "text-accent" : "text-ink-2"}`}>
                        <Settings size={15} />{t("topbar.settings")}
                      </Link>
                    </div>

                    {/* Preferences */}
                    <div className="border-t border-ink-3/8 py-1">
                      {/* Theme */}
                      <button
                        onClick={() => { const next = theme === "light" ? "dark" : theme === "dark" ? "system" : "light"; setTheme(next); }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-[14px] text-ink-2 hover:bg-ink-3/5 transition-colors"
                      >
                        {theme === "system" ? <Monitor size={15} /> : resolved === "dark" ? <Moon size={15} /> : <Sun size={15} />}
                        {theme === "system" ? t("topbar.systemTheme") : resolved === "dark" ? t("topbar.darkTheme") : t("topbar.lightTheme")}
                      </button>
                      {/* Language */}
                      <div className="flex items-center gap-1 px-4 py-1.5">
                        {(["ru", "en"] as Locale[]).map(l => (
                          <button
                            key={l}
                            onClick={() => switchLocale(l)}
                            className={`flex-1 py-1 rounded-md text-[13px] transition-colors ${locale === l ? "bg-accent text-white font-medium" : "bg-ink-3/5 text-ink-2 hover:text-ink"}`}
                          >
                            {LOCALE_FLAGS[l]} {l.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Logout */}
                    <div className="border-t border-ink-3/8">
                      <button
                        onClick={() => { setUserMenu(false); signOut({ callbackUrl: "/login" }); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-[14px] text-red-500 hover:bg-red-50 dark:hover:bg-red-900/15 transition-colors"
                      >
                        <LogOut size={15} />{t("topbar.logout")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1.5 bg-accent text-white rounded-lg px-4 py-1.5 text-[14px] tracking-[0.05em] uppercase hover:bg-accent/90 transition-colors no-underline btn-press hover-glow"
              >
                <LogIn size={13} />
                {t("topbar.login")}
              </Link>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? t("common.close") : t("topbar.menu")}
              className="md:hidden flex items-center justify-center w-8 h-8 rounded-md text-ink-3 hover:text-ink hover:bg-ink-3/5 transition-all btn-press"
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
          <div className="absolute top-topbar right-0 bottom-0 w-full sm:w-72 bg-surface sm:border-l border-t border-ink-3/10 shadow-lg overflow-y-auto" style={{ animation: "slideUp 0.3s var(--ease-out-expo)" }}>
            <nav className="p-3 space-y-0.5" aria-label="Mobile navigation">
              {/* Core nav */}
              {coreNav.map(link => {
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[16px] transition-all no-underline ${
                      active ? "text-accent bg-accent/8 font-medium" : "text-ink-2 hover:text-ink hover:bg-ink-3/5"
                    }`}
                  >
                    <link.icon size={17} className={active ? "text-accent" : "text-ink-3"} />
                    {link.label}
                  </Link>
                );
              })}

              {/* Secondary nav */}
              {session && (
                <>
                  <div className="border-t border-ink-3/8 my-2" />
                  <Link href="/wallet" onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[16px] transition-all no-underline ${isActive("/wallet") ? "text-accent bg-accent/8 font-medium" : "text-ink-2 hover:text-ink hover:bg-ink-3/5"}`}>
                    <Wallet size={17} className={isActive("/wallet") ? "text-accent" : "text-ink-3"} />{t("topbar.wallet")}
                  </Link>
                  <Link href="/team" onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[16px] transition-all no-underline ${isActive("/team") ? "text-accent bg-accent/8 font-medium" : "text-ink-2 hover:text-ink hover:bg-ink-3/5"}`}>
                    <Users size={17} className={isActive("/team") ? "text-accent" : "text-ink-3"} />{t("topbar.team")}
                  </Link>
                  <Link href="/settings" onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[16px] transition-all no-underline ${isActive("/settings") ? "text-accent bg-accent/8 font-medium" : "text-ink-2 hover:text-ink hover:bg-ink-3/5"}`}>
                    <Settings size={17} className={isActive("/settings") ? "text-accent" : "text-ink-3"} />{t("topbar.settings")}
                  </Link>
                </>
              )}

              {/* Credits */}
              {session && balance !== null && (
                <div className="flex items-center gap-2 px-3 py-2 text-[15px] text-accent">
                  <Coins size={15} />{balance} {t("common.credits")}
                </div>
              )}

              {/* Prefs */}
              <div className="border-t border-ink-3/8 my-2" />
              <div className="flex gap-1 px-3 py-1">
                {(["ru", "en"] as Locale[]).map(l => (
                  <button
                    key={l}
                    onClick={() => { switchLocale(l); setMobileOpen(false); }}
                    className={`flex-1 py-1.5 rounded-md text-[14px] transition-colors ${locale === l ? "bg-accent text-white" : "bg-background text-ink-2 hover:text-ink"}`}
                  >
                    {LOCALE_FLAGS[l]} {l.toUpperCase()}
                  </button>
                ))}
              </div>
              <button
                onClick={() => { const next = theme === "light" ? "dark" : theme === "dark" ? "system" : "light"; setTheme(next); setMobileOpen(false); }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[16px] text-ink-2 hover:text-ink hover:bg-ink-3/5 transition-all w-full text-left"
              >
                {theme === "system" ? <Monitor size={17} className="text-ink-3" /> : resolved === "dark" ? <Moon size={17} className="text-ink-3" /> : <Sun size={17} className="text-ink-3" />}
                {theme === "system" ? t("topbar.systemTheme") : resolved === "dark" ? t("topbar.darkTheme") : t("topbar.lightTheme")}
              </button>

              {/* Logout */}
              {session && (
                <>
                  <div className="border-t border-ink-3/8 my-2" />
                  <button
                    onClick={() => { setMobileOpen(false); signOut({ callbackUrl: "/login" }); }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[16px] text-red-500 hover:bg-red-50 dark:hover:bg-red-900/15 transition-all w-full text-left"
                  >
                    <LogOut size={17} />{t("topbar.logout")}
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
