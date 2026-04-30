"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import Topbar from "@/components/Topbar";
import { Map, Search, Unlock, Lock, ShoppingBag, ArrowRight, ChevronRight, SlidersHorizontal } from "lucide-react";
import { useLocale, TranslationKey } from "@/lib/i18n";

interface ListingUser {
  name: string | null;
}

interface Listing {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  license: string;
  price: number;
  listedAt: string;
  user: ListingUser;
  _count: { entities: number; relations: number };
}

const LICENSE_LABELS: Record<string, { labelKey: TranslationKey; icon: typeof Unlock; color: string; bg: string }> = {
  open: { labelKey: "marketplace.open", icon: Unlock, color: "#16A34A", bg: "bg-green-50 border-green-200" },
  paid: { labelKey: "marketplace.paid", icon: Lock, color: "#D97706", bg: "bg-amber-50 border-amber-200" },
};

export default function MarketplacePage() {
  const { t } = useLocale();
  const { data: session } = useSession();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "open" | "paid">("all");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter !== "all") params.set("license", filter);
    if (debouncedSearch) params.set("search", debouncedSearch);
    try {
      const res = await fetch(`/api/marketplace?${params}`);
      if (res.ok) setListings(await res.json());
    } catch (e) { console.error("fetchListings:", e); }
    setLoading(false);
  }, [filter, debouncedSearch]);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  const totalCount = listings.length;
  const openCount = listings.filter(l => l.license === "open").length;
  const paidCount = listings.filter(l => l.license === "paid").length;
  const totalEntities = listings.reduce((s, l) => s + l._count.entities, 0);

  return (
    <div className="min-h-screen bg-background">
      <Topbar />

      <main id="main-content">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-ink-3/10">
          <div className="absolute inset-0 bg-gradient-to-b from-accent-light/20 via-transparent to-transparent pointer-events-none" />
          <div className="relative max-w-5xl mx-auto px-4 md:px-7 pt-10 md:pt-16 pb-8 md:pb-12">
          <div className="inline-flex items-center gap-2 bg-accent-light text-accent rounded-full px-3.5 py-1 text-[15px] tracking-[0.2em] uppercase mb-4 border border-accent/10">
            <ShoppingBag size={10} />
            {t("marketplace.badge")}
          </div>
          <h1 className="font-serif text-[38px] md:text-[54px] font-light text-ink leading-[1.05] mb-3">
            {t("marketplace.title")}
          </h1>
          <p className="text-ink-2 text-[19px] md:text-[20px] max-w-lg leading-relaxed mb-8">
            {t("marketplace.desc")}
          </p>

          {/* Stats row */}
          <div className="flex items-center gap-6 md:gap-10 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-[26px] font-light text-ink">{totalCount}</span>
              <span className="text-[15px] tracking-[0.15em] uppercase text-ink-3">{t("dashboard.universes")}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[26px] font-light text-ink">{totalEntities}</span>
              <span className="text-[15px] tracking-[0.15em] uppercase text-ink-3">{t("ai.entities")}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[26px] font-light text-green-600">{openCount}</span>
              <span className="text-[15px] tracking-[0.15em] uppercase text-ink-3">{t("marketplace.free")}</span>
            </div>
          </div>
          </div>
        </section>

        {/* Filters bar */}
        <section className="sticky top-topbar bg-surface/90 backdrop-blur-md border-b border-ink-3/10 z-40">
          <div className="max-w-5xl mx-auto px-4 md:px-7 py-3 flex items-center gap-3 flex-wrap">
            <SlidersHorizontal size={12} className="text-ink-3 flex-shrink-0" />
            <div className="flex bg-background rounded-lg border border-ink-3/10 p-0.5">
              {(["all", "open", "paid"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  aria-label={f === "all" ? t("universe.all") : f === "open" ? t("marketplace.open") : t("marketplace.paid")}
                  className={`px-3.5 py-1.5 rounded-md text-[15px] tracking-[0.15em] uppercase transition-all ${
                    filter === f ? "bg-accent text-white shadow-sm" : "text-ink-3 hover:text-ink"
                  }`}
                >
                  {f === "all" ? `${t("universe.all")} (${totalCount})` : f === "open" ? `${t("marketplace.open")} (${openCount})` : `${t("marketplace.paid")} (${paidCount})`}
                </button>
              ))}
            </div>
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t("marketplace.searchPlaceholder")}
                aria-label={t("marketplace.searchPlaceholder")}
                className="bg-background border border-ink-3/12 rounded-lg pl-8 pr-3 py-2 text-[17px] text-ink focus:outline-none focus:border-accent w-full transition-colors"
              />
            </div>
          </div>
        </section>

        {/* Grid */}
        <section className="max-w-5xl mx-auto px-4 md:px-7 py-8 md:py-12">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-7 h-7 rounded-full border-2 border-accent border-t-transparent animate-spin" />
            </div>
          ) : listings.length === 0 ? (
            <div className="text-center py-20">
              <ShoppingBag size={40} className="mx-auto text-ink-3/40 mb-4" />
              <h3 className="font-serif text-[20px] font-light text-ink-2 mb-2">{t("universe.nothingFound")}</h3>
              <p className="text-ink-3 text-[17px]">{t("marketplace.tryDifferentFilters")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {listings.map(u => {
                const lic = LICENSE_LABELS[u.license] || LICENSE_LABELS.open;
                const LicIcon = lic.icon;
                return (
                  <Link
                    key={u.id}
                    href={`/marketplace/${u.slug}`}
                    className="bg-surface rounded-xl border border-ink-3/10 hover:border-ink-3/25 hover:shadow-md transition-all p-5 no-underline group"
                  >
                    {/* Top: license + price */}
                    <div className="flex items-center justify-between mb-4">
                      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[14px] tracking-[0.15em] uppercase ${lic.bg}`} style={{ color: lic.color }}>
                        <LicIcon size={10} />
                        {t(lic.labelKey)}
                      </div>
                      {u.license === "paid" ? (
                        <span className="text-[20px] font-light text-ink">{u.price} ₽</span>
                      ) : (
                        <span className="text-[16px] text-green-600 font-medium">{t("marketplace.free")}</span>
                      )}
                    </div>

                    {/* Name */}
                    <h3 className="font-serif text-[26px] font-light text-ink mb-2 group-hover:text-accent transition-colors">
                      {u.name}
                    </h3>

                    {/* Description */}
                    {u.description && (
                      <p className="text-[17px] text-ink-2 leading-relaxed mb-4 line-clamp-2">
                        {u.description}
                      </p>
                    )}

                    {/* Entity type dots */}
                    <div className="flex items-center gap-2 mb-4">
                      <span className="flex items-center gap-1 text-[15px] text-ink-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#2D5BE3]" />
                        {u._count.entities} {t("dashboard.entitiesShort")}
                      </span>
                      <span className="flex items-center gap-1 text-[15px] text-ink-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                        {u._count.relations} {t("dashboard.relationsShort")}
                      </span>
                    </div>

                    {/* Bottom: author + arrow */}
                    <div className="flex items-center justify-between pt-3 border-t border-ink-3/8">
                      <span className="text-[16px] text-ink-3">{u.user.name || t("marketplace.anonymous")}</span>
                      <ChevronRight size={12} className="text-ink-3 group-hover:text-accent transition-colors" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* CTA */}
        <section className="bg-surface border-t border-ink-3/10">
          <div className="max-w-3xl mx-auto px-4 md:px-7 py-12 md:py-16 text-center">
            <h2 className="font-serif text-[30px] md:text-[38px] font-light text-ink mb-3">{t("marketplace.ctaTitle")}</h2>
            <p className="text-ink-2 text-[18px] max-w-md mx-auto leading-relaxed mb-6">
              {t("marketplace.ctaDesc")}
            </p>
            <Link
              href={session ? "/dashboard" : "/login"}
              className="inline-flex items-center gap-2 bg-accent text-white rounded-xl px-6 py-3 text-[17px] tracking-[0.12em] uppercase hover:bg-accent/90 transition-colors no-underline"
            >
              {session ? t("dashboard.myUniverses") : t("marketplace.startCreating")}
              <ArrowRight size={14} />
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-ink-3/12 bg-surface">
        <div className="max-w-5xl mx-auto px-4 md:px-7 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Map size={12} className="text-accent" />
              <span className="font-serif text-[16px] font-light text-ink-2">Canonix</span>
            </div>
            <nav className="flex items-center gap-4 text-[15px] tracking-[0.15em] uppercase text-ink-3" aria-label="Footer">
              <Link href="/legal/terms" className="hover:text-accent transition-colors no-underline">{t("login.terms")}</Link>
              <Link href="/legal/privacy" className="hover:text-accent transition-colors no-underline">{t("login.privacy")}</Link>
              <span>canonix.app · 2026</span>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
