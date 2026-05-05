"use client";

import { signOut } from "next-auth/react";
import { UniverseCreateForm } from "@/components/UniverseCreateForm";
import { OnboardingGuide } from "@/components/OnboardingGuide";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ToastProvider } from "@/components/Toast";
import { useLocale } from "@/lib/i18n";
import { useDashboard } from "@/lib/useDashboard";
import {
  Map, Plus, Globe, Lock, Link2, Trash2, ExternalLink,
  User, ShoppingBag, Unlock, Edit3, Check, X, LogOut,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

function DashboardInner() {
  const { t } = useLocale();
  const {
    session, sessionStatus, loading,
    profile, universes,
    showCreate, setShowCreate,
    editingName, setEditingName, userName, setUserName, saveName,
    editingBio, setEditingBio, userBio, setUserBio, saveBio,
    deleteTarget, setDeleteTarget, handleCreate, confirmDeleteUniverse,
    totalEntities, totalRelations, listedCount,
  } = useDashboard();

  const visIcon = (v: string) => {
    if (v === "public") return Globe;
    if (v === "link") return Link2;
    return Lock;
  };

  const visLabel = (v: string) => {
    if (v === "public") return t("universeSettings.visibilityPublic");
    if (v === "link") return t("universeSettings.visibilityLink");
    return t("universeSettings.visibilityPrivate");
  };

  const licenseBadge = (u: { license: string; price: number }) => {
    if (u.license === "open") return { label: t("universeSettings.licenseOpen"), icon: Unlock, color: "text-green-600" };
    if (u.license === "paid") return { label: `${u.price} ₽`, icon: ShoppingBag, color: "text-amber-600" };
    return null;
  };

  if (sessionStatus === "loading" || loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 md:px-7 py-8 md:py-12">
          {/* Profile skeleton */}
          <div className="bg-surface rounded-xl border border-ink-3/10 p-6 md:p-8 mb-8">
            <div className="flex items-start gap-5">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full skeleton flex-shrink-0" />
              <div className="flex-1 space-y-3">
                <div className="h-7 w-48 skeleton" />
                <div className="h-5 w-72 skeleton" />
                <div className="h-4 w-56 skeleton" />
              </div>
            </div>
          </div>
          {/* Universe cards skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[10px]">
            {[0, 1, 2].map(i => (
              <div key={i} className="bg-surface rounded-lg border border-ink-3/10 p-[18px_20px]">
                <div className="h-6 w-32 skeleton mb-2" />
                <div className="h-4 w-48 skeleton mb-3" />
                <div className="h-4 w-64 skeleton" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const displayName = profile?.name || profile?.email || t("dashboard.user");

  return (
    <div className="min-h-screen bg-background">
      <main id="main-content" className="max-w-4xl mx-auto px-4 md:px-7 py-8 md:py-12">
        {/* Profile header */}
        <div className="bg-surface rounded-xl border border-ink-3/10 p-6 md:p-8 mb-8">
          <div className="flex flex-col sm:flex-row items-start gap-5">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-accent-light flex items-center justify-center flex-shrink-0 overflow-hidden">
              {profile?.image ? (
                <Image src={profile.image} alt={profile.name || "Avatar"} width={80} height={80} className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover" unoptimized={profile.image?.startsWith("data:")} />
              ) : (
                <User size={32} className="text-accent" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {editingName ? (
                  <div className="flex items-center gap-2">
                    <input
                      value={userName}
                      onChange={e => setUserName(e.target.value)}
                      className="bg-background border border-ink-3/20 rounded-md px-2 py-1 text-[22px] font-serif font-light text-ink focus:outline-none focus:border-accent"
                      autoFocus
                    />
                    <button onClick={saveName} className="p-1 text-accent hover:bg-accent-light rounded"><Check size={14} /></button>
                    <button onClick={() => { setEditingName(false); setUserName(profile?.name || ""); }} className="p-1 text-ink-3 hover:bg-ink-3/10 rounded"><X size={14} /></button>
                  </div>
                ) : (
                  <>
                    <h1 className="font-serif text-[28px] md:text-[34px] font-light text-ink">{displayName}</h1>
                    <button onClick={() => setEditingName(true)} className="p-1 text-ink-3 hover:text-accent rounded" style={{ opacity: 0.3 }}>
                      <Edit3 size={12} />
                    </button>
                  </>
                )}
              </div>

              {editingBio ? (
                <div className="flex items-start gap-2 mb-3">
                  <textarea
                    value={userBio}
                    onChange={e => setUserBio(e.target.value)}
                    rows={2}
                    className="flex-1 bg-background border border-ink-3/20 rounded-md px-2 py-1 text-[18px] text-ink-2 focus:outline-none focus:border-accent resize-none"
                    autoFocus
                  />
                  <div className="flex flex-col gap-1">
                    <button onClick={saveBio} className="p-1 text-accent hover:bg-accent-light rounded"><Check size={14} /></button>
                    <button onClick={() => { setEditingBio(false); setUserBio(profile?.bio || ""); }} className="p-1 text-ink-3 hover:bg-ink-3/10 rounded"><X size={14} /></button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 mb-3">
                  <p className="text-ink-2 text-[18px] leading-relaxed">{profile?.bio || t("dashboard.noBio")}</p>
                  <button onClick={() => setEditingBio(true)} className="p-1 text-ink-3 hover:text-accent rounded flex-shrink-0" style={{ opacity: 0.3 }}>
                    <Edit3 size={10} />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-1.5 text-[16px] tracking-[0.1em] uppercase text-ink-3">
                  <Map size={10} />
                  <span>{universes.length} {t("dashboard.universes")}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[16px] tracking-[0.1em] uppercase text-ink-3">
                  <span>{totalEntities} {t("ai.entities")}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[16px] tracking-[0.1em] uppercase text-ink-3">
                  <span>{totalRelations} {t("ai.relations")}</span>
                </div>
                {listedCount > 0 && (
                  <div className="flex items-center gap-1.5 text-[16px] tracking-[0.1em] uppercase text-accent">
                    <ShoppingBag size={10} />
                    <span>{listedCount} {t("dashboard.inMarketplace")}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions row */}
          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-ink-3/10">
            <span className="text-[16px] text-ink-3">{profile?.email}</span>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="ml-auto flex items-center gap-1.5 text-[15px] tracking-[0.15em] uppercase text-ink-3 hover:text-red-500 transition-colors"
            >
              <LogOut size={10} />
              {t("topbar.logout")}
            </button>
          </div>
        </div>

        {/* Universes section */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5">
          <div>
            <h2 className="font-serif text-[22px] sm:text-[26px] font-light text-ink leading-tight">{t("dashboard.myUniverses")}</h2>
            <p className="text-ink-3 text-[15px] sm:text-[16px] mt-0.5">{t("dashboard.myUniversesDesc")}</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center justify-center gap-1.5 bg-accent text-white rounded-xl px-4 py-2 text-[14px] sm:text-[16px] tracking-[0.1em] uppercase hover:bg-accent/90 transition-colors shrink-0"
          >
            <Plus size={14} />
            {t("dashboard.new")}
          </button>
        </div>

        {universes.length === 0 ? (
          <OnboardingGuide onCreateUniverse={() => setShowCreate(true)} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[10px]">
            {universes.map(u => {
              const VisIcon = visIcon(u.visibility);
              const badge = licenseBadge(u);
              return (
                <div
                  key={u.id}
                  className="bg-surface rounded-lg border border-ink-3/10 p-[18px_20px] hover:border-ink-3/25 hover:shadow-md transition-all group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/u/${u.slug}`}
                        className="font-serif text-[24px] font-light text-ink hover:text-accent transition-colors no-underline block truncate"
                      >
                        {u.name}
                      </Link>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-[15px] tracking-[0.2em] uppercase text-ink-3">
                          <VisIcon size={10} />
                          {visLabel(u.visibility)}
                        </span>
                        <span className="text-ink-3">·</span>
                        <span className="text-[15px] tracking-[0.2em] uppercase text-ink-3">
                          {u._count.entities} {t("dashboard.entitiesShort")}
                        </span>
                        <span className="text-ink-3">·</span>
                        <span className="text-[15px] tracking-[0.2em] uppercase text-ink-3">
                          {u._count.relations} {t("dashboard.relationsShort")}
                        </span>
                        {badge && (
                          <>
                            <span className="text-ink-3">·</span>
                            <span className={`inline-flex items-center gap-1 text-[15px] tracking-[0.15em] uppercase ${badge.color}`}>
                              <badge.icon size={10} />
                              {badge.label}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      {u.visibility !== "private" && (
                        <Link
                          href={`/s/${u.slug}`}
                          className="p-1.5 rounded-md hover:bg-ink-3/10 text-ink-3 hover:text-accent"
                          title={t("dashboard.publicLink")}
                        >
                          <ExternalLink size={14} />
                        </Link>
                      )}
                      <button
                        onClick={() => setDeleteTarget({ id: u.id, name: u.name })}
                        className="p-1.5 rounded-md hover:bg-red-50 text-ink-3 hover:text-red-500 transition-colors"
                        title={t("common.delete")}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  {u.description && (
                    <p className="text-[17px] text-ink-2 line-clamp-2">{u.description}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {showCreate && (
        <UniverseCreateForm
          onSubmit={handleCreate}
          onCancel={() => setShowCreate(false)}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title={t("dashboard.deleteUniverse")}
        message={t("dashboard.deleteUniverseMessage", { name: deleteTarget?.name || "" })}
        confirmLabel={t("universeSettings.deleteForever")}
        onConfirm={confirmDeleteUniverse}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ToastProvider>
      <DashboardInner />
    </ToastProvider>
  );
}
