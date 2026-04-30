"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Topbar from "@/components/Topbar";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useCredits } from "@/components/CreditProvider";
import {
  Users, UserPlus, X, Loader2, Mail, Shield, Crown, Trash2, Check, Globe, AlertCircle,
} from "lucide-react";
import { useLocale } from "@/lib/i18n";

interface TeamMemberData {
  id: string;
  role: string;
  joinedAt: string;
  user: { id: string; name: string | null; email: string; image: string | null };
}

interface PendingInvite {
  id: string;
  invitee: { id: string; name: string | null; email: string };
}

interface TeamData {
  id: string;
  name: string;
  slug: string;
  myRole: string;
  owner: { id: string; name: string | null; email: string };
  members: TeamMemberData[];
  pendingInvitations: PendingInvite[];
  universes: { id: string; name: string; slug: string }[];
  maxMembers: number;
}

export default function TeamPage() {
  const { t } = useLocale();
  const { data: session } = useSession();
  const [team, setTeam] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pendingReceived, setPendingReceived] = useState<{id: string; teamName: string; teamId: string}[]>([]);
  const { refreshBalance } = useCredits();

  // Auto-dismiss success
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(null), 4000);
      return () => clearTimeout(t);
    }
  }, [success]);

  const fetchTeam = useCallback(async () => {
    try {
      const res = await fetch("/api/team");
      if (!res.ok) { setError(t("common.error")); return; }
      const data = await res.json();
      setTeam(data.team);
    } catch {
      setError(t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { fetchTeam(); }, [fetchTeam]);

  useEffect(() => {
    if (session) {
      fetch("/api/team/invitations").then(r => r.json()).then(d => {
        if (d.invitations) setPendingReceived(d.invitations);
      }).catch(() => {});
    }
  }, [session]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviteLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("team.inviteError"));
      } else {
        setSuccess(t("team.inviteSent", { name: data.invitee?.name || data.invitee?.email }));
        setInviteEmail("");
        fetchTeam();
      }
    } catch {
      setError(t("common.error"));
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRespondInvite = async (invitationId: string, action: "accept" | "reject") => {
    setError(null);
    try {
      const res = await fetch("/api/team/invite", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId, action }),
      });
      if (res.ok) {
        fetchTeam();
        refreshBalance();
        // Refresh pending invitations
        setPendingReceived(prev => prev.filter(i => i.id !== invitationId));
        if (action === "accept") {
          setSuccess(t("team.joinedTeam"));
        }
      }
    } catch {
      setError(t("common.error"));
    }
  };

  const [removeMemberTarget, setRemoveMemberTarget] = useState<string | null>(null);

  const handleRemoveMember = (memberId: string) => {
    setRemoveMemberTarget(memberId);
  };

  const confirmRemoveMember = async () => {
    if (!removeMemberTarget) return;
    setError(null);
    try {
      const res = await fetch("/api/team/invite", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: removeMemberTarget }),
      });
      setRemoveMemberTarget(null);
      if (res.ok) {
        fetchTeam();
        setSuccess(t("team.memberRemoved"));
      } else {
        const data = await res.json();
        setError(data.error || t("common.error"));
      }
    } catch {
      setError(t("team.connectionError"));
    }
  };

  const handleCancelInvite = async (invitationId: string) => {
    setError(null);
    try {
      const res = await fetch("/api/team/invite", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId }),
      });
      if (res.ok) {
        fetchTeam();
        setSuccess(t("team.inviteCancelled"));
      }
    } catch {
      setError(t("common.error"));
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-background">
        <Topbar />
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <p className="text-ink-2 mb-4">{t("team.loginToManage")}</p>
            <Link href="/login" className="bg-accent text-white rounded-xl px-6 py-2.5 text-[18px] no-underline">{t("login.login")}</Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Topbar />
        <div className="flex items-center justify-center h-screen">
          <Loader2 size={24} className="animate-spin text-accent" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Topbar />

      <main id="main-content" className="max-w-3xl mx-auto px-4 md:px-7 py-10">
        {/* Messages */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md px-3 py-2 text-[18px] text-red-600 dark:text-red-400 mb-4 flex items-center gap-2" role="alert"><AlertCircle size={14} className="flex-shrink-0" />{error}</div>
        )}
        {success && (
          <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-md px-3 py-2 text-[18px] text-green-600 dark:text-green-400 mb-4 flex items-center gap-2" role="status"><Check size={14} className="flex-shrink-0" />{success}</div>
        )}
        {/* Pending invitations received */}
        {pendingReceived.length > 0 && (
          <div className="mb-8 space-y-2">
            <h3 className="text-[17px] tracking-[0.2em] uppercase text-ink-3 mb-3">{t("team.incomingInvites")}</h3>
            {pendingReceived.map(inv => (
              <div key={inv.id} className="bg-accent-light/20 border border-accent/20 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <span className="text-[19px] text-ink">{t("team.inviteToTeam", { name: inv.teamName })}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRespondInvite(inv.id, "accept")}
                    className="px-3 py-1.5 bg-accent text-white rounded-md text-[17px] flex items-center gap-1"
                  >
                    <Check size={12} /> {t("team.accept")}
                  </button>
                  <button
                    onClick={() => handleRespondInvite(inv.id, "reject")}
                    className="px-3 py-1.5 bg-background border border-ink-3/20 text-ink-2 rounded-md text-[17px]"
                  >
                    {t("team.reject")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!team ? (
          <div className="text-center py-20">
            <Users size={48} className="text-ink-3/30 mx-auto mb-4" />
            <h2 className="font-serif text-[26px] font-light text-ink mb-2">{t("team.noTeam")}</h2>
            <p className="text-ink-2 text-[19px] mb-6">{t("team.corporateOnly")}</p>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 bg-accent text-white rounded-xl px-6 py-3 text-[18px] tracking-[0.1em] uppercase no-underline hover:bg-accent/90"
            >
              <Crown size={14} /> {t("team.goCorporate")}
            </Link>
          </div>
        ) : (
          <>
            {/* Team header */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                <Users size={24} className="text-accent" />
              </div>
              <div>
                <h1 className="font-serif text-[26px] font-light text-ink">{team.name}</h1>
                <span className="text-[16px] tracking-[0.15em] uppercase text-ink-3">
                  {team.members.length}/{team.maxMembers} {t("team.members")} · {team.myRole === "admin" ? t("team.admin") : t("team.member")}
                </span>
              </div>
            </div>

            {/* Members */}
            <div className="mb-8">
              <h3 className="text-[17px] tracking-[0.2em] uppercase text-ink-3 mb-3">{t("team.members")}</h3>
              <div className="space-y-2">
                {team.members.map(m => (
                  <div key={m.id} className="bg-surface rounded-lg border border-ink-3/10 p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-ink-3/10 flex items-center justify-center text-[18px] text-ink-2">
                      {m.user.name?.[0]?.toUpperCase() || m.user.email[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[19px] text-ink truncate">{m.user.name || m.user.email}</div>
                      <div className="text-[16px] text-ink-3">{m.user.email}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {m.role === "admin" ? (
                        <span className="flex items-center gap-1 text-[15px] tracking-[0.1em] uppercase text-accent">
                          <Crown size={10} /> {t("team.admin")}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[15px] tracking-[0.1em] uppercase text-ink-3">
                          <Shield size={10} /> {t("team.member")}
                        </span>
                      )}
                      {team.myRole === "admin" && m.role !== "admin" && (
                        <button
                          onClick={() => handleRemoveMember(m.id)}
                          className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-ink-3 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pending invitations */}
            {team.pendingInvitations.length > 0 && (
              <div className="mb-8">
                <h3 className="text-[17px] tracking-[0.2em] uppercase text-ink-3 mb-3">{t("team.pendingInvites")}</h3>
                <div className="space-y-2">
                  {team.pendingInvitations.map(inv => (
                    <div key={inv.id} className="bg-surface rounded-lg border border-ink-3/10 p-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-ink-3/5 flex items-center justify-center">
                        <Mail size={14} className="text-ink-3" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[19px] text-ink truncate">{inv.invitee.name || inv.invitee.email}</div>
                        <div className="text-[16px] text-ink-3">{inv.invitee.email}</div>
                      </div>
                      {team.myRole === "admin" && (
                        <button
                          onClick={() => handleCancelInvite(inv.id)}
                          className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-ink-3 hover:text-red-500 transition-colors"
                          title={t("team.cancelInvite")}
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Invite form (admin only) */}
            {team.myRole === "admin" && team.members.length < team.maxMembers && (
              <div className="mb-8">
                <h3 className="text-[17px] tracking-[0.2em] uppercase text-ink-3 mb-3">{t("team.inviteMember")}</h3>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleInvite(); }}
                    placeholder={t("team.invitePlaceholder")}
                    className="flex-1 bg-background border border-ink-3/20 rounded-md px-3 py-2 text-[19px] text-ink focus:outline-none focus:border-accent"
                  />
                  <button
                    onClick={handleInvite}
                    disabled={inviteLoading || !inviteEmail.trim()}
                    className="px-4 py-2 bg-accent text-white rounded-md text-[18px] flex items-center gap-1.5 hover:bg-accent/90 disabled:opacity-50"
                  >
                    {inviteLoading ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                    {t("team.invite")}
                  </button>
                </div>
              </div>
            )}

            {/* Team universes */}
            <div className="mb-8">
              <h3 className="text-[17px] tracking-[0.2em] uppercase text-ink-3 mb-3">{t("team.sharedUniverses")}</h3>
              {team.universes.length === 0 ? (
                <p className="text-[18px] text-ink-3">{t("team.noSharedUniverses")}</p>
              ) : (
                <div className="space-y-2">
                  {team.universes.map(u => (
                    <Link
                      key={u.id}
                      href={`/u/${u.slug}`}
                      className="block bg-surface rounded-lg border border-ink-3/10 p-3 hover:border-accent/30 transition-colors no-underline"
                    >
                      <div className="flex items-center gap-2">
                        <Globe size={14} className="text-accent" />
                        <span className="text-[19px] text-ink">{u.name}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      <ConfirmDialog
        open={!!removeMemberTarget}
        title={t("team.removeMemberTitle")}
        message={t("team.removeMemberMessage")}
        confirmLabel={t("common.delete")}
        onConfirm={confirmRemoveMember}
        onCancel={() => setRemoveMemberTarget(null)}
      />
    </div>
  );
}
