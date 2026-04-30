"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/Toast";
import { useLocale } from "@/lib/i18n";

export interface Universe {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  visibility: string;
  license: string;
  price: number;
  listedAt: string | null;
  _count: { entities: number; relations: number };
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  name: string | null;
  bio: string | null;
  email: string;
  image: string | null;
  _count: { universes: number };
}

export function useDashboard() {
  const { t } = useLocale();
  const { data: session, status: sessionStatus } = useSession({ required: true });
  const [universes, setUniverses] = useState<Universe[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editingBio, setEditingBio] = useState(false);
  const [userName, setUserName] = useState("");
  const [userBio, setUserBio] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
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

  const fetchUniverses = useCallback(async () => {
    try {
      const res = await fetch("/api/universes");
      if (res.ok) {
        const data = await res.json();
        setUniverses(Array.isArray(data) ? data : data.universes || []);
      }
    } catch (e) { console.error("fetchUniverses:", e); } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (sessionStatus === "authenticated") { fetchProfile(); fetchUniverses(); }
  }, [sessionStatus, fetchProfile, fetchUniverses]);

  const handleCreate = useCallback(async (data: { name: string; description: string; visibility: string }) => {
    const res = await fetch("/api/universes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const universe = await res.json();
      setShowCreate(false);
      fetchUniverses();
      toast(t("dashboard.universeCreated"));
      return universe.slug as string;
    } else {
      const err = await res.json();
      toast(err.error || t("common.error"), "error");
      return null;
    }
  }, [fetchUniverses, toast, t]);

  const confirmDeleteUniverse = useCallback(async () => {
    if (!deleteTarget) return;
    const res = await fetch(`/api/universes?id=${deleteTarget.id}`, { method: "DELETE" });
    setDeleteTarget(null);
    fetchUniverses();
    if (res.ok) toast(t("dashboard.universeDeleted"), "info");
    else toast(t("common.error"), "error");
  }, [deleteTarget, fetchUniverses, toast, t]);

  const saveName = useCallback(async () => {
    const res = await fetch("/api/user", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: userName.trim() || null }),
    });
    setEditingName(false);
    fetchProfile();
    if (res.ok) toast(t("dashboard.nameUpdated"));
    else toast(t("common.error"), "error");
  }, [userName, fetchProfile, toast, t]);

  const saveBio = useCallback(async () => {
    const res = await fetch("/api/user", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bio: userBio.trim() || null }),
    });
    setEditingBio(false);
    fetchProfile();
    if (res.ok) toast(t("dashboard.bioUpdated"));
    else toast(t("common.error"), "error");
  }, [userBio, fetchProfile, toast, t]);

  const totalEntities = universes.reduce((s, u) => s + u._count.entities, 0);
  const totalRelations = universes.reduce((s, u) => s + u._count.relations, 0);
  const listedCount = universes.filter(u => u.listedAt).length;

  return {
    session, sessionStatus, loading,
    profile, universes,
    showCreate, setShowCreate,
    editingName, setEditingName, userName, setUserName, saveName,
    editingBio, setEditingBio, userBio, setUserBio, saveBio,
    deleteTarget, setDeleteTarget, handleCreate, confirmDeleteUniverse,
    totalEntities, totalRelations, listedCount,
    fetchProfile,
  };
}
