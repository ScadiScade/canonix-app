import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Canonix",
  description: "Privacy policy and data handling practices for Canonix platform.",
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
