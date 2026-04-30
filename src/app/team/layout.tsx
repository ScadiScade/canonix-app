import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Team — Canonix",
  description: "Manage your team members, invitations, and shared universes.",
};

export default function TeamLayout({ children }: { children: React.ReactNode }) {
  return children;
}
