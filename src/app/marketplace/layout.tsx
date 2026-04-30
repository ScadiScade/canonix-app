import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Universe Marketplace — Canonix",
  description: "Browse ready-made universe lore bases — from open worlds to exclusive collections.",
};

export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
