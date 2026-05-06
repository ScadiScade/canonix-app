import type { Metadata } from "next";
import localFont from "next/font/local";
import AuthProvider from "@/components/AuthProvider";
import { CreditProvider } from "@/components/CreditProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LocaleProvider } from "@/lib/i18n";
import { HtmlLang } from "@/components/HtmlLang";
import Topbar from "@/components/Topbar";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Footer } from "@/components/Footer";
import "./globals.css";

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: {
    default: "Canonix — Map Any Universe",
    template: "%s — Canonix",
  },
  description: "Create structured maps of fictional and real universes — characters, events, places, organizations and their relationships. Visualize, explore, share.",
  keywords: ["worldbuilding", "universe builder", "entity map", "fictional worlds", "canonix", "lore manager", "relationship graph"],
  openGraph: {
    type: "website",
    siteName: "Canonix",
    locale: "ru_RU",
    alternateLocale: ["en_US"],
    title: "Canonix — Map Any Universe",
    description: "Create structured maps of fictional and real universes — characters, events, places, organizations and their relationships.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Canonix — Map Any Universe",
    description: "Create structured maps of fictional and real universes.",
  },
  robots: { index: true, follow: true },
  alternates: { canonical: "https://canonix.app" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('canonix-theme');var d=t==='dark'||(t==='system'||!t)&&matchMedia('(prefers-color-scheme:dark)').matches;document.documentElement.classList.toggle('dark',d)}catch(e){}})()` }} />
      </head>
      <body className={`${geistMono.variable} antialiased bg-background text-ink pt-topbar min-h-screen flex flex-col`}>
        <a href="#main-content" className="skip-to-content">Skip to content</a>
        <AuthProvider><LocaleProvider><ThemeProvider><HtmlLang /><CreditProvider><Topbar /><ScrollReveal><div className="page-enter flex-1 min-h-0">{children}</div></ScrollReveal></CreditProvider></ThemeProvider></LocaleProvider></AuthProvider>
        <Footer />
      </body>
    </html>
  );
}
