import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings — Canonix",
  description: "Manage your profile, account settings, and subscription.",
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
