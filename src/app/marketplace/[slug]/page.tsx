"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Map, Unlock, Lock, ShoppingBag, ArrowRight, Copy, Users, Globe, Zap, Building2, GitBranch, Loader2 } from "lucide-react";
import { resolveGroup } from "@/lib/types";
import { useToast, ToastProvider } from "@/components/Toast";
import { useLocale, TranslationKey } from "@/lib/i18n";

interface Entity {
  id: string;
  name: string;
  type: string;
  description?: string | null;
  date?: string | null;
}

interface Relation {
  id: string;
  sourceId: string;
  targetId: string;
  label: string;
}

interface ListingDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  license: string;
  price: number;
  listedAt: string;
  user: { name: string | null };
  entities: Entity[];
  relations: Relation[];
}

const LICENSE_INFO: Record<string, { labelKey: TranslationKey; icon: typeof Unlock; color: string; bg: string; descKey: TranslationKey }> = {
  open: {
    labelKey: "marketplace.openLicense",
    icon: Unlock,
    color: "#16A34A",
    bg: "bg-green-50 border-green-200",
    descKey: "marketplace.openLicenseDesc",
  },
  paid: {
    labelKey: "marketplace.paidLicense",
    icon: Lock,
    color: "#D97706",
    bg: "bg-amber-50 border-amber-200",
    descKey: "marketplace.paidLicenseDesc",
  },
};

const typeIcons: Record<string, typeof Users> = {
  character: Users,
  planet: Globe,
  event: Zap,
  organization: Building2,
};

function MarketplaceDetailInner() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useLocale();
  const [data, setData] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    fetch(`/api/universes/${slug}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [slug]);

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-ink-3 text-[13px] tracking-[0.2em] uppercase">{t("common.loading")}</div>
    </div>
  );

  if (!data) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
      <ShoppingBag size={40} className="text-ink-3/40" />
      <p className="text-ink-3 text-[14px]">{t("marketplace.universeNotFound")}</p>
      <Link href="/marketplace" className="text-accent text-[12px] tracking-[0.1em] uppercase hover:underline no-underline">← {t("marketplace.backToMarketplace")}</Link>
    </div>
  );

  const lic = LICENSE_INFO[data.license] || LICENSE_INFO.open;
  const LicIcon = lic.icon;
  const entityCounts = data.entities.reduce((acc, e) => {
    acc[e.type] = (acc[e.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-background">
      <main id="main-content" className="max-w-5xl mx-auto px-4 md:px-7 py-8 md:py-14">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left: Content */}
          <div className="flex-1 min-w-0">
            {/* License badge */}
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] tracking-[0.15em] uppercase mb-5 ${lic.bg}`} style={{ color: lic.color }}>
              <LicIcon size={12} />
              {t(lic.labelKey)}
            </div>

            <h1 className="font-serif text-[38px] md:text-[54px] font-light text-ink leading-[1.05] mb-4">
              {data.name}
            </h1>

            {data.description && (
              <p className="text-ink-2 text-[16px] md:text-[17px] leading-relaxed mb-8 max-w-xl">{data.description}</p>
            )}

            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
              {Object.entries(entityCounts).map(([type, count]) => {
                const Icon = typeIcons[type] || Users;
                return (
                  <div key={type} className="bg-surface rounded-lg border border-ink-3/10 p-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: resolveGroup(type, []).color + "12" }}>
                      <Icon size={14} style={{ color: resolveGroup(type, []).color }} />
                    </div>
                    <div>
                      <div className="text-[20px] font-light text-ink">{count}</div>
                      <div className="text-[10px] tracking-[0.15em] uppercase text-ink-3">{resolveGroup(type, []).name}</div>
                    </div>
                  </div>
                );
              })}
              <div className="bg-surface rounded-lg border border-ink-3/10 p-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#2D5BE3]12">
                  <GitBranch size={14} className="text-[#2D5BE3]" />
                </div>
                <div>
                  <div className="text-[20px] font-light text-ink">{data.relations.length}</div>
                  <div className="text-[10px] tracking-[0.15em] uppercase text-ink-3">{t("dashboard.relationsShort")}</div>
                </div>
              </div>
            </div>

            {/* License info */}
            <div className="bg-surface rounded-xl border border-ink-3/10 p-5 mb-8">
              <h3 className="text-[12px] tracking-[0.2em] uppercase text-ink-3 mb-2">{t("marketplace.licenseTerms")}</h3>
              <p className="text-[14px] text-ink-2 leading-relaxed">{t(lic.descKey)}</p>
            </div>

            {/* Author */}
            <div className="flex items-center gap-3 text-[13px] text-ink-3">
              <span>{t("marketplace.author")}:</span>
              <span className="text-ink font-medium">{data.user.name || t("marketplace.anonymous")}</span>
            </div>
          </div>

          {/* Right: Sticky action card */}
          <div className="lg:w-[300px] flex-shrink-0">
            <div className="bg-surface rounded-xl border border-ink-3/12 p-6 sticky top-[calc(52px+24px)] shadow-sm">
              {/* Price */}
              <div className="text-center mb-5 pb-5 border-b border-ink-3/10">
                {data.license === "open" ? (
                  <div>
                    <div className="text-[34px] font-light text-ink mb-1">{t("pricing.free")}</div>
                    <div className="text-[11px] tracking-[0.15em] uppercase text-ink-3">{t("marketplace.openLicense")}</div>
                  </div>
                ) : (
                  <div>
                    <div className="text-[34px] font-light text-ink mb-1">{data.price} ₽</div>
                    <div className="text-[11px] tracking-[0.15em] uppercase text-ink-3">{t("marketplace.paidLicense")}</div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="space-y-2.5 mb-5">
                {data.license === "open" ? (
                  <>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/s/${data.slug}`);
                        toast(t("universe.linkCopied"));
                      }}
                      className="w-full flex items-center justify-center gap-2 bg-accent text-white rounded-xl px-4 py-3 text-[12px] tracking-[0.12em] uppercase hover:bg-accent/90 transition-colors"
                    >
                      <Copy size={12} />
                      {t("marketplace.copyLink")}
                    </button>
                    <Link
                      href={`/s/${data.slug}`}
                      className="w-full flex items-center justify-center gap-2 bg-background text-ink border border-ink-3/15 rounded-xl px-4 py-3 text-[12px] tracking-[0.12em] uppercase hover:border-ink-3/30 transition-colors no-underline"
                    >
                      {t("marketplace.openPreview")}
                      <ArrowRight size={12} />
                    </Link>
                  </>
                ) : (
                  <>
                    <button
                      onClick={async () => {
                        setBuying(true);
                        try {
                          const res = await fetch("/api/marketplace/purchase", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ universeId: data.id }),
                          });
                          const result = await res.json();
                          if (res.ok) {
                            toast(t("marketplace.purchased"));
                            router.push(`/s/${result.slug || data.slug}`);
                          } else if (res.status === 402) {
                            toast(t("pricing.insufficientBalance"));
                          } else if (res.status === 409) {
                            toast(t("marketplace.alreadyPurchased"));
                            router.push(`/s/${data.slug}`);
                          } else {
                            toast(result.error || t("common.error"));
                          }
                        } catch {
                          toast(t("common.error"));
                        } finally {
                          setBuying(false);
                        }
                      }}
                      disabled={buying}
                      className="w-full flex items-center justify-center gap-2 bg-accent text-white rounded-xl px-4 py-3 text-[12px] tracking-[0.12em] uppercase hover:bg-accent/90 transition-colors disabled:opacity-50"
                    >
                      {buying ? <Loader2 size={12} className="animate-spin" /> : null}
                      {buying ? t("common.loading") : t("marketplace.buyFor", { price: data.price })}
                    </button>
                    <Link
                      href={`/s/${data.slug}`}
                      className="w-full flex items-center justify-center gap-2 bg-background text-ink border border-ink-3/15 rounded-xl px-4 py-3 text-[12px] tracking-[0.12em] uppercase hover:border-ink-3/30 transition-colors no-underline"
                    >
                      {t("marketplace.preview")}
                    </Link>
                  </>
                )}
              </div>

              {/* Entity list */}
              <div className="pt-4 border-t border-ink-3/10">
                <div className="text-[11px] tracking-[0.15em] uppercase text-ink-3 mb-3">{t("ai.entities")} ({data.entities.length})</div>
                <div className="space-y-1 max-h-[280px] overflow-y-auto">
                  {data.entities.slice(0, 20).map(e => (
                    <div key={e.id} className="flex items-center gap-2 py-1.5 px-1 rounded hover:bg-background transition-colors">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: resolveGroup(e.type, []).color }} />
                      <span className="text-[13px] text-ink-2 truncate flex-1">{e.name}</span>
                      <span className="text-[10px] tracking-[0.1em] uppercase text-ink-3 flex-shrink-0">
                        {resolveGroup(e.type, []).name}
                      </span>
                    </div>
                  ))}
                  {data.entities.length > 20 && (
                    <div className="text-[11px] text-ink-3 text-center py-1">
                      + {t("marketplace.more", { count: data.entities.length - 20 })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

    </div>
  );
}

export default function MarketplaceDetailPage() {
  return (
    <ToastProvider>
      <MarketplaceDetailInner />
    </ToastProvider>
  );
}
