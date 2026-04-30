import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Data Processing Consent — Canonix",
  description: "Consent for personal data processing on Canonix platform.",
};

export default function ConsentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
