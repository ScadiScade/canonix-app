"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import Topbar from "@/components/Topbar";
import { ToastProvider, useToast } from "@/components/Toast";
import { useLocale } from "@/lib/i18n";
import {
  User, Settings, Edit3, Check, X, LogOut, Trash2, AlertTriangle, Loader2, Mail, Camera,
} from "lucide-react";
import Image from "next/image";

interface UserProfile {
  id: string;
  name: string | null;
  bio: string | null;
  email: string;
  image: string | null;
  createdAt: string;
  _count: { universes: number };
}

function SettingsInner() {
  const { t, locale } = useLocale();
  const { data: session, status: sessionStatus, update: updateSession } = useSession({ required: true });
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit fields
  const [editingName, setEditingName] = useState(false);
  const [editingBio, setEditingBio] = useState(false);
  const [userName, setUserName] = useState("");
  const [userBio, setUserBio] = useState("");

  // Delete account
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { toast } = useToast();

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/user");
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setUserName(data.name || "");
        setUserBio(data.bio || "");
      }
    } catch (e) { console.error("fetchProfile:", e); }
  }, []);

  useEffect(() => {
    if (sessionStatus === "authenticated") { fetchProfile().finally(() => setLoading(false)); }
  }, [sessionStatus, fetchProfile]);

  const saveName = async () => {
    await fetch("/api/user", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: userName.trim() || null }),
    });
    setEditingName(false);
    fetchProfile();
    updateSession();
    toast(t("dashboard.nameUpdated"));
  };

  const saveBio = async () => {
    await fetch("/api/user", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bio: userBio.trim() || null }),
    });
    setEditingBio(false);
    fetchProfile();
    updateSession();
    toast(t("dashboard.bioUpdated"));
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== t("settings.deleteConfirmType")) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/user", { method: "DELETE" });
      if (res.ok) {
        await signOut({ callbackUrl: "/login" });
      } else {
        toast(t("settings.deleteAccountError"), "error");
      }
    } catch {
      toast(t("settings.deleteAccountError"), "error");
    } finally {
      setDeleting(false);
    }
  };

  if (sessionStatus === "loading" || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Topbar />
        <div className="flex items-center justify-center h-[calc(100vh-52px)]">
          <div className="w-7 h-7 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  if (!session) return null;

  const createdAt = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString(locale === "en" ? "en-US" : "ru-RU", { day: "numeric", month: "long", year: "numeric" })
    : "";

  return (
    <div className="min-h-screen bg-background">
      <Topbar />

      <main id="main-content" className="max-w-2xl mx-auto px-4 md:px-7 py-8 md:py-12">
        {/* Page header */}
        <div className="flex items-center gap-3 mb-8">
          <Settings size={20} className="text-accent" />
          <h1 className="font-serif text-[30px] md:text-[34px] font-light text-ink">{t("settings.title")}</h1>
        </div>

        {/* Profile section */}
        <section className="bg-surface rounded-xl border border-ink-3/10 p-6 md:p-8 mb-6">
          <h2 className="font-serif text-[22px] font-light text-ink mb-5">{t("settings.profile")}</h2>

          {/* Avatar + name */}
          <div className="flex items-start gap-5 mb-6">
            <div className="relative group">
              <div className="w-14 h-14 rounded-full bg-accent-light flex items-center justify-center flex-shrink-0 overflow-hidden">
                {profile?.image ? (
                  <Image src={profile.image} alt={profile.name || "Avatar"} width={56} height={56} className="w-14 h-14 rounded-full object-cover" unoptimized={profile.image?.startsWith("data:")} />
                ) : (
                  <User size={24} className="text-accent" />
                )}
              </div>
              <label className="absolute inset-0 rounded-full bg-ink/40 flex items-center justify-center md:opacity-0 md:group-hover:opacity-100 transition-opacity cursor-pointer">
                {uploading ? (
                  <Loader2 size={16} className="animate-spin text-white" />
                ) : (
                  <Camera size={16} className="text-white" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 2 * 1024 * 1024) {
                      toast(t("settings.photoTooLarge"), "error");
                      return;
                    }
                    setUploading(true);
                    try {
                      const reader = new FileReader();
                      reader.onload = async (ev) => {
                        const base64 = ev.target?.result as string;
                        await fetch("/api/user", {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ image: base64 }),
                        });
                        fetchProfile();
                        updateSession();
                        toast(t("settings.photoUpdated"));
                        setUploading(false);
                      };
                      reader.readAsDataURL(file);
                    } catch {
                      toast(t("settings.photoUploadError"), "error");
                      setUploading(false);
                    }
                  }}
                />
              </label>
              {profile?.image && (
                <button
                  onClick={async () => {
                    await fetch("/api/user", {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ image: null }),
                    });
                    fetchProfile();
                    updateSession();
                    toast(t("settings.photoDeleted"));
                  }}
                  className="absolute -bottom-1 -right-1 w-5 h-5 bg-surface border border-ink-3/20 rounded-full flex items-center justify-center text-ink-3 hover:text-red-500 transition-colors"
                  title={t("common.delete")}
                >
                  <X size={10} />
                </button>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <label className="text-[15px] tracking-[0.2em] uppercase text-ink-3 mb-1.5 block">{t("settings.name")}</label>
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    value={userName}
                    onChange={e => setUserName(e.target.value)}
                    className="flex-1 bg-background border border-ink-3/20 rounded-md px-3 py-2 text-[20px] text-ink focus:outline-none focus:border-accent"
                    autoFocus
                    onKeyDown={e => e.key === "Enter" && saveName()}
                  />
                  <button onClick={saveName} className="p-1.5 text-accent hover:bg-accent-light rounded"><Check size={16} /></button>
                  <button onClick={() => { setEditingName(false); setUserName(profile?.name || ""); }} className="p-1.5 text-ink-3 hover:bg-ink-3/10 rounded"><X size={16} /></button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-[20px] text-ink">{profile?.name || t("settings.notSpecified")}</span>
                  <button onClick={() => setEditingName(true)} className="p-1 text-ink-3 hover:text-accent rounded">
                    <Edit3 size={12} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Bio */}
          <div className="mb-6">
            <label className="text-[15px] tracking-[0.2em] uppercase text-ink-3 mb-1.5 block">{t("settings.bio")}</label>
            {editingBio ? (
              <div className="flex items-start gap-2">
                <textarea
                  value={userBio}
                  onChange={e => setUserBio(e.target.value)}
                  rows={3}
                  className="flex-1 bg-background border border-ink-3/20 rounded-md px-3 py-2 text-[19px] text-ink-2 focus:outline-none focus:border-accent resize-none"
                  autoFocus
                />
                <div className="flex flex-col gap-1">
                  <button onClick={saveBio} className="p-1.5 text-accent hover:bg-accent-light rounded"><Check size={16} /></button>
                  <button onClick={() => { setEditingBio(false); setUserBio(profile?.bio || ""); }} className="p-1.5 text-ink-3 hover:bg-ink-3/10 rounded"><X size={16} /></button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <p className="text-[19px] text-ink-2 leading-relaxed flex-1">{profile?.bio || t("dashboard.noBio")}</p>
                <button onClick={() => setEditingBio(true)} className="p-1 text-ink-3 hover:text-accent rounded flex-shrink-0">
                  <Edit3 size={12} />
                </button>
              </div>
            )}
          </div>

          {/* Email (read-only) */}
          <div className="mb-4">
            <label className="text-[15px] tracking-[0.2em] uppercase text-ink-3 mb-1.5 block">{t("settings.email")}</label>
            <div className="flex items-center gap-2 text-[19px] text-ink-2">
              <Mail size={14} className="text-ink-3" />
              {profile?.email}
            </div>
          </div>

          {/* Meta */}
          <div className="flex items-center gap-4 flex-wrap pt-4 border-t border-ink-3/10">
            <span className="text-[16px] text-ink-3">{t("settings.joinedOn")} {createdAt}</span>
            <span className="text-[16px] text-ink-3">{profile?._count.universes || 0} {t("dashboard.universes")}</span>
          </div>
        </section>

        {/* Account section */}
        <section className="bg-surface rounded-xl border border-ink-3/10 p-6 md:p-8 mb-6">
          <h2 className="font-serif text-[22px] font-light text-ink mb-5">{t("settings.account")}</h2>

          <div className="flex items-center gap-3 mb-5">
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-2 bg-ink-3/8 border border-ink-3/15 rounded-xl px-5 py-2.5 text-[17px] tracking-[0.08em] text-ink hover:border-ink-3/30 transition-all"
            >
              <LogOut size={14} />
              {t("settings.signOut")}
            </button>
          </div>

          {/* Danger zone */}
          <div className="pt-5 border-t border-ink-3/10">
            <h3 className="text-[16px] tracking-[0.2em] uppercase text-red-400 mb-3">{t("settings.dangerZone")}</h3>
            <p className="text-[18px] text-ink-2 mb-4">
              {t("settings.deleteAccountDesc")}
            </p>

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 border border-red-200 dark:border-red-800 rounded-xl px-5 py-2.5 text-[17px] tracking-[0.08em] text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
              >
                <Trash2 size={14} />
                {t("settings.deleteAccount")}
              </button>
            ) : (
              <div className="bg-red-50/50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={16} className="text-red-500" />
                  <span className="text-[19px] font-medium text-red-600 dark:text-red-400">{t("settings.confirmDeletion")}</span>
                </div>
                <p className="text-[18px] text-ink-2 mb-3">
                  {t("settings.typeDelete")}
                </p>
                <input
                  value={deleteConfirmText}
                  onChange={e => setDeleteConfirmText(e.target.value)}
                  placeholder={t("settings.deleteConfirmType")}
                  className="w-full bg-surface border border-red-200 dark:border-red-800 rounded-md px-3 py-2 text-[20px] text-ink focus:outline-none focus:border-red-400 mb-3"
                  autoFocus
                />
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleteConfirmText !== t("settings.deleteConfirmType") || deleting}
                    className="flex items-center gap-2 bg-red-500 text-white rounded-xl px-5 py-2.5 text-[17px] tracking-[0.08em] hover:bg-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    {deleting ? t("common.loading") : t("universeSettings.deleteForever")}
                  </button>
                  <button
                    onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(""); }}
                    className="text-[17px] text-ink-3 hover:text-ink underline"
                  >
                    {t("common.cancel")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <ToastProvider>
      <SettingsInner />
    </ToastProvider>
  );
}
