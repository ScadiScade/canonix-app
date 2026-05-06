"use client";

import { useSession } from "next-auth/react";
import { useLocale, TranslationKey } from "@/lib/i18n";
import { ENTITY_COLORS } from "@/lib/ui/constants";
import { Button } from "@/components/ui";
import {
  Map, Users, Globe, Zap, Building2, LayoutGrid, GitBranch,
  Clock, ArrowRight, ChevronRight, Sparkles, Crown, X,
} from "lucide-react";
import { Illustration } from "@/components/ui";

// ── Typed data arrays (no 'as' casts needed) ──
interface EntityTypeItem {
  icon: typeof Users;
  typeKey: TranslationKey;
  descKey: TranslationKey;
  colorKey: keyof typeof ENTITY_COLORS;
}

interface ViewItem {
  icon: typeof LayoutGrid;
  titleKey: TranslationKey;
  descKey: TranslationKey;
  colorKey: keyof typeof ENTITY_COLORS;
}

interface StepItem {
  num: string;
  titleKey: TranslationKey;
  descKey: TranslationKey;
}

interface PreviewEntity {
  nameKey: TranslationKey;
  typeKey: TranslationKey;
  colorKey: keyof typeof ENTITY_COLORS;
}

const entityTypes: EntityTypeItem[] = [
  { icon: Users, typeKey: "landing.etCharacter", descKey: "landing.etCharacterDesc", colorKey: "character" },
  { icon: Globe, typeKey: "landing.etPlace", descKey: "landing.etPlaceDesc", colorKey: "place" },
  { icon: Zap, typeKey: "landing.etEvent", descKey: "landing.etEventDesc", colorKey: "event" },
  { icon: Building2, typeKey: "landing.etOrg", descKey: "landing.etOrgDesc", colorKey: "org" },
];

const views: ViewItem[] = [
  { icon: LayoutGrid, titleKey: "landing.fBento", descKey: "landing.fBentoDesc", colorKey: "character" },
  { icon: GitBranch, titleKey: "landing.fGraph", descKey: "landing.fGraphDesc", colorKey: "place" },
  { icon: Clock, titleKey: "landing.fTimeline", descKey: "landing.fTimelineDesc", colorKey: "event" },
];

const steps: StepItem[] = [
  { num: "01", titleKey: "landing.s1Title", descKey: "landing.s1Desc" },
  { num: "02", titleKey: "landing.s2Title", descKey: "landing.s2Desc" },
  { num: "03", titleKey: "landing.s3Title", descKey: "landing.s3Desc" },
];

const previewEntities: PreviewEntity[] = [
  { nameKey: "landing.peAnakin", typeKey: "landing.etCharacter", colorKey: "character" },
  { nameKey: "landing.peTatooine", typeKey: "landing.etPlace", colorKey: "place" },
  { nameKey: "landing.peOrder66", typeKey: "landing.etEvent", colorKey: "event" },
  { nameKey: "landing.peJedi", typeKey: "landing.etOrg", colorKey: "org" },
  { nameKey: "landing.peObiwan", typeKey: "landing.etCharacter", colorKey: "character" },
  { nameKey: "landing.peCoruscant", typeKey: "landing.etPlace", colorKey: "place" },
  { nameKey: "landing.peRepublic", typeKey: "landing.etEvent", colorKey: "event" },
  { nameKey: "landing.peEmpire", typeKey: "landing.etOrg", colorKey: "org" },
];

interface FaqItem { qKey: TranslationKey; aKey: TranslationKey; }

const faqItems: FaqItem[] = [
  { qKey: "landing.faq1q", aKey: "landing.faq1a" },
  { qKey: "landing.faq2q", aKey: "landing.faq2a" },
  { qKey: "landing.faq3q", aKey: "landing.faq3a" },
  { qKey: "landing.faq4q", aKey: "landing.faq4a" },
];

export default function Home() {
  const { data: session } = useSession();
  const { t } = useLocale();

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "Canonix",
        url: "https://canonix.app",
        logo: "https://canonix.app/logo.png",
        sameAs: [],
      },
      {
        "@type": "WebSite",
        name: "Canonix — Map Any Universe",
        url: "https://canonix.app",
        potentialAction: {
          "@type": "SearchAction",
          target: "https://canonix.app/marketplace?search={search_term_string}",
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "FAQPage",
        mainEntity: faqItems.map((f) => ({
          "@type": "Question",
          name: t(f.qKey),
          acceptedAnswer: {
            "@type": "Answer",
            text: t(f.aKey),
          },
        })),
      },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main id="main-content">
        {/* ═══ Hero: Pain → Solution ═══ */}
        <section className="max-w-3xl mx-auto px-4 md:px-7 pt-16 md:pt-24 pb-14 md:pb-20 text-center reveal">
          <div className="flex justify-center mb-6 reveal-delay-1">
            <Illustration name="universe" width={120} height={120} />
          </div>
          <p className="text-[13px] tracking-[0.2em] uppercase text-ink-3 mb-4 reveal-delay-1">{t("landing.heroTag")}</p>
          <h1 className="font-serif text-[34px] sm:text-[48px] md:text-[60px] font-light text-ink leading-[1.08] mb-5 reveal-delay-2">
            {t("landing.heroTitle1")}<br />{t("landing.heroTitle2")}
          </h1>
          <p className="text-ink-2 text-[16px] sm:text-[18px] max-w-lg mx-auto leading-relaxed mb-8 reveal-delay-3">
            {t("landing.heroDesc")}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center reveal-delay-4">
            <Button
              as="link"
              href={session ? "/dashboard" : "/login"}
              variant="primary"
              icon={ArrowRight}
              iconRight
              fullWidth
              className="sm:w-auto sm:justify-center"
            >
              {session ? t("landing.myUniverses") : t("landing.startFree")}
            </Button>
            <Button
              as="link"
              href="/marketplace"
              variant="secondary"
              icon={ChevronRight}
              iconRight
              fullWidth
              className="sm:w-auto sm:justify-center"
            >
              {t("landing.marketplace")}
            </Button>
          </div>
          <p className="text-[13px] text-ink-3 mt-4 reveal-delay-5">{t("landing.heroSub")}</p>
        </section>

        {/* ── Preview mockup ── */}
        <section className="max-w-4xl mx-auto px-4 md:px-7 pb-24 reveal">
          <div className="bg-surface rounded-xl border border-ink-3/12 p-4 md:p-6 shadow-sm hover:shadow-md transition-shadow duration-500">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-2">
                <Map size={14} className="text-accent" />
                <span className="font-serif text-[15px] font-light text-ink">Star Wars</span>
              </div>
              <div className="flex bg-background rounded-lg border border-ink-3/10 p-0.5 ml-auto overflow-x-auto no-scrollbar">
                <span className="px-2 py-0.5 rounded-md text-[12px] tracking-[0.12em] uppercase bg-accent text-white">Bento</span>
                <span className="px-2 py-0.5 rounded-md text-[12px] tracking-[0.12em] uppercase text-ink-3">{t("landing.previewGraph")}</span>
                <span className="px-2 py-0.5 rounded-md text-[12px] tracking-[0.12em] uppercase text-ink-3">{t("landing.previewTimeline")}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {previewEntities.map(e => (
                <div key={e.nameKey} className="bg-background rounded-lg p-3 border border-ink-3/8 hover-lift">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ENTITY_COLORS[e.colorKey].hex }} />
                    <span className="text-[11px] tracking-[0.12em] uppercase text-ink-3">{t(e.typeKey)}</span>
                  </div>
                  <span className="font-serif text-[17px] font-light text-ink leading-snug">{t(e.nameKey)}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ Pain point: Free vs Pro (loss aversion + anchoring) ═══ */}
        <section className="max-w-4xl mx-auto px-4 md:px-7 pb-20 reveal">
          <div className="text-center mb-8">
            <h2 className="font-serif text-[24px] sm:text-[32px] md:text-[38px] font-light text-ink">{t("landing.painTitle")}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-surface rounded-xl border border-ink-3/10 p-6">
              <p className="text-[13px] tracking-[0.15em] uppercase text-ink-3 mb-3">{t("landing.painFreeLabel")}</p>
              <ul className="space-y-2.5">
                <li className="flex items-start gap-2.5 text-[15px] text-ink-2"><X size={14} className="text-red-400 mt-0.5 flex-shrink-0" />{t("landing.painF1")}</li>
                <li className="flex items-start gap-2.5 text-[15px] text-ink-2"><X size={14} className="text-red-400 mt-0.5 flex-shrink-0" />{t("landing.painF2")}</li>
                <li className="flex items-start gap-2.5 text-[15px] text-ink-2"><X size={14} className="text-red-400 mt-0.5 flex-shrink-0" />{t("landing.painF3")}</li>
                <li className="flex items-start gap-2.5 text-[15px] text-ink-2"><X size={14} className="text-red-400 mt-0.5 flex-shrink-0" />{t("landing.painF4")}</li>
              </ul>
            </div>
            <div className="bg-accent-light rounded-xl border border-accent/15 p-6 relative">
              <div className="absolute top-4 right-4 bg-accent text-white text-[11px] tracking-[0.15em] uppercase px-2.5 py-0.5 rounded-full">{t("landing.painProBadge")}</div>
              <p className="text-[13px] tracking-[0.15em] uppercase text-accent mb-3">{t("landing.painProLabel")}</p>
              <ul className="space-y-2.5">
                <li className="flex items-start gap-2.5 text-[15px] text-ink"><Sparkles size={14} className="text-accent mt-0.5 flex-shrink-0" />{t("landing.painP1")}</li>
                <li className="flex items-start gap-2.5 text-[15px] text-ink"><Sparkles size={14} className="text-accent mt-0.5 flex-shrink-0" />{t("landing.painP2")}</li>
                <li className="flex items-start gap-2.5 text-[15px] text-ink"><Sparkles size={14} className="text-accent mt-0.5 flex-shrink-0" />{t("landing.painP3")}</li>
                <li className="flex items-start gap-2.5 text-[15px] text-ink"><Crown size={14} className="text-accent mt-0.5 flex-shrink-0" />{t("landing.painP4")}</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── Entity types ── */}
        <section className="max-w-4xl mx-auto px-4 md:px-7 pb-24 reveal">
          <div className="text-center mb-8">
            <h2 className="font-serif text-[26px] sm:text-[34px] md:text-[40px] font-light text-ink">{t("landing.entityTypesTitle")}</h2>
            <p className="text-ink-2 text-[15px] sm:text-[17px] mt-2 max-w-md mx-auto">{t("landing.entityTypesDesc")}</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {entityTypes.map(({ icon: Icon, typeKey, descKey, colorKey }) => (
              <div key={typeKey} className="bg-surface rounded-lg p-4 border border-ink-3/10 hover:border-ink-3/25 transition-all hover-lift">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: ENTITY_COLORS[colorKey].bg }}>
                  <Icon size={15} style={{ color: ENTITY_COLORS[colorKey].hex }} />
                </div>
                <h3 className="font-serif text-[17px] sm:text-[20px] font-light text-ink mb-1">{t(typeKey)}</h3>
                <p className="text-[13px] sm:text-[14px] text-ink-2 leading-relaxed">{t(descKey)}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Features ── */}
        <section className="max-w-4xl mx-auto px-4 md:px-7 pb-24 reveal">
          <div className="text-center mb-8">
            <h2 className="font-serif text-[26px] sm:text-[34px] md:text-[40px] font-light text-ink">{t("landing.featuresTitle")}</h2>
            <p className="text-ink-2 text-[15px] sm:text-[17px] mt-2 max-w-md mx-auto">{t("landing.featuresDesc")}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {views.map(({ icon: Icon, titleKey, descKey, colorKey }) => (
              <div key={titleKey} className="bg-surface rounded-lg p-5 border border-ink-3/10 hover:border-ink-3/25 transition-all hover-lift">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: ENTITY_COLORS[colorKey].bg }}>
                  <Icon size={15} style={{ color: ENTITY_COLORS[colorKey].hex }} />
                </div>
                <h3 className="font-serif text-[17px] sm:text-[20px] font-light text-ink mb-1">{t(titleKey)}</h3>
                <p className="text-[13px] sm:text-[14px] text-ink-2 leading-relaxed">{t(descKey)}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="max-w-4xl mx-auto px-4 md:px-7 pb-24 reveal">
          <div className="text-center mb-8">
            <h2 className="font-serif text-[26px] sm:text-[34px] md:text-[40px] font-light text-ink">{t("landing.howTitle")}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {steps.map(({ num, titleKey, descKey }) => (
              <div key={num} className="bg-surface rounded-lg p-5 border border-ink-3/10 hover-lift">
                <span className="text-[12px] tracking-[0.15em] text-accent/40 uppercase mb-2 block">{num}</span>
                <h3 className="font-serif text-[19px] font-light text-ink mb-1">{t(titleKey)}</h3>
                <p className="text-[14px] text-ink-2 leading-relaxed">{t(descKey)}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="max-w-2xl mx-auto px-4 md:px-7 pb-24 reveal" itemScope itemType="https://schema.org/FAQPage">
          <div className="text-center mb-8">
            <h2 className="font-serif text-[26px] sm:text-[34px] md:text-[40px] font-light text-ink">{t("landing.faqTitle")}</h2>
          </div>
          <div className="space-y-2">
            {faqItems.map(({ qKey, aKey }) => (
              <details key={qKey} className="group bg-surface rounded-lg border border-ink-3/10 open:border-ink-3/20 transition-all hover:bg-ink-3/2" itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
                <summary className="flex items-center justify-between gap-3 p-4 cursor-pointer list-none select-none">
                  <span className="font-serif text-[16px] font-light text-ink" itemProp="name">{t(qKey)}</span>
                  <ChevronRight size={14} className="text-ink-3 transition-transform duration-200 group-open:rotate-90 flex-shrink-0" />
                </summary>
                <div className="px-4 pb-4 text-[14px] text-ink-2 leading-relaxed" itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
                  <p itemProp="text">{t(aKey)}</p>
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* ═══ CTA: Urgency + loss aversion ═══ */}
        <section className="max-w-2xl mx-auto px-4 md:px-7 pb-24 text-center reveal">
          <h2 className="font-serif text-[30px] md:text-[42px] font-light text-ink leading-[1.1] mb-4">
            {t("landing.ctaTitle1")}<br />{t("landing.ctaTitle2")}
          </h2>
          <p className="text-ink-2 text-[16px] md:text-[17px] max-w-md mx-auto leading-relaxed mb-6">
            {t("landing.ctaDesc")}
          </p>
          <Button
            as="link"
            href={session ? "/dashboard" : "/login"}
            variant="primary"
            icon={ArrowRight}
            iconRight
          >
            {session ? t("landing.myUniverses") : t("landing.createUniverse")}
          </Button>
          <p className="text-[13px] text-ink-3 mt-4">{t("landing.ctaSub")}</p>
        </section>
      </main>

    </div>
  );
}
