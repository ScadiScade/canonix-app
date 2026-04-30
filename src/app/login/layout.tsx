import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login — Canonix",
  description: "Sign in or create an account to start building your universe map.",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
