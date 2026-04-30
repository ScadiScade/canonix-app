import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Credits & Pricing — Canonix",
  description: "Choose a plan for your needs. All plans include basic features — paid ones unlock AI and team capabilities.",
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
