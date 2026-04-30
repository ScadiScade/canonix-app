import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Canonix",
  description: "Terms of service and user agreement for Canonix platform.",
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
