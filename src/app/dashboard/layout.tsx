import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard — Canonix",
  description: "Manage your universes, view your profile and credits balance.",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
