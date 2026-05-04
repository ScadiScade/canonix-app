"use client";

import { useState, useEffect, FormEvent, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Map, Eye, EyeOff, AlertCircle, Loader2, Check, X, ArrowRight, Mail } from "lucide-react";
import Link from "next/link";
import { useLocale } from "@/lib/i18n";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" fill="white"/>
    </svg>
  );
}

function PasswordStrength({ password }: { password: string }) {
  const { t } = useLocale();
  const getStrength = (p: string) => {
    let score = 0;
    if (p.length >= 6) score++;
    if (p.length >= 10) score++;
    if (/[A-ZА-Я]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-zА-Яа-я0-9]/.test(p)) score++;
    return score;
  };
  const strength = getStrength(password);
  if (!password) return null;
  const labels = [t("login.pwVeryWeak"), t("login.pwWeak"), t("login.pwFair"), t("login.pwGood"), t("login.pwStrong")];
  const colors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-green-400", "bg-green-600"];
  const idx = Math.min(strength, 5) - 1;
  return (
    <div className="mt-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full ${i <= idx ? colors[idx] : "bg-ink-3/15"} transition-colors`} />
        ))}
      </div>
      <p className={`text-[15px] mt-1 ${idx >= 3 ? "text-green-600" : idx >= 1 ? "text-ink-3" : "text-red-500"}`}>
        {labels[idx] || t("login.pwVeryWeak")}
      </p>
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="flex items-center gap-1 text-red-500 text-[16px] mt-1">
      <AlertCircle size={10} />
      {message}
    </p>
  );
}

function LoginPageInner() {
  const { t } = useLocale();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [telegramLoading, setTelegramLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [verifySent, setVerifySent] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [needVerify, setNeedVerify] = useState(false); // login failed because email not verified

  // Handle verify URL params
  useEffect(() => {
    const v = searchParams.get("verify");
    if (v === "success") setError(""); // Clear — they just verified
    else if (v === "expired") setError(t("login.verifyExpired"));
    else if (v === "invalid") setError(t("login.verifyInvalid"));
    else if (v === "missing") setError(t("login.verifyMissing"));
  }, [searchParams]);

  // Auto-login from Telegram bot link (tg_token param)
  useEffect(() => {
    const tgToken = searchParams.get("tg_token");
    if (!tgToken) return;

    setLoading(true);
    setError("");

    (async () => {
      try {
        const checkRes = await fetch(`/api/auth/telegram/check?token=${tgToken}`);
        const data = await checkRes.json();

        if (data.status === "ok" && data.user) {
          await signIn("telegram", {
            id: data.user.id,
            first_name: data.user.first_name || "",
            last_name: data.user.last_name || "",
            username: data.user.username,
            photo_url: data.user.photo_url || "",
            auth_date: data.user.auth_date,
            hash: data.user.hash,
            callbackUrl: "/dashboard",
            redirect: true,
          });
        } else {
          setError(t("login.telegramLinkExpired"));
          setLoading(false);
        }
      } catch {
        setError(t("common.error"));
        setLoading(false);
      }
    })();
  }, [searchParams]);

  const handleTelegramLogin = async () => {
    setTelegramLoading(true);
    setError("");
    try {
      const genRes = await fetch("/api/auth/telegram/generate", { method: "POST" });
      const { token, botUsername } = await genRes.json();
      window.open(`https://t.me/${botUsername}?start=${token}`, "_blank");
    } catch {
      setError(t("common.error"));
      setTelegramLoading(false);
    }
  };

  const DISPOSABLE_PATTERNS = [/temp/i, /throw/i, /trash/i, /spam/i, /fake/i, /burn/i, /dispos/i, /guerril/i, /maildrop/i, /10min/i, /20min/i, /duck\.com/i];
  const BLOCKED_DOMAINS = new Set(["duck.com", "guerrillamail.com", "mailinator.com", "yopmail.com", "tempmail.com", "temp-mail.org", "throwaway.email", "trashmail.com", "sharklasers.com", "grr.la", "simplelogin.com", "anonaddy.com", "relay.firefox.com"]);

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    // Skip validation if dev access code is entered
    if (email.trim().length > 20 && !email.includes("@")) {
      // Looks like a dev code, skip all validation
      setFieldErrors(errors);
      return true;
    }
    if (!email.trim()) errors.email = t("login.enterEmail");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = t("login.invalidEmail");
    else if (mode === "register") {
      const domain = email.split("@")[1]?.toLowerCase();
      if (BLOCKED_DOMAINS.has(domain) || DISPOSABLE_PATTERNS.some(p => p.test(domain))) {
        errors.email = t("login.disposableEmail");
      }
    }
    if (!password) errors.password = t("login.enterPassword");
    else if (password.length < 6) errors.password = t("login.passwordMin");
    if (mode === "register") {
      if (!name.trim()) errors.name = t("login.enterName");
      if (password !== confirmPassword) errors.confirmPassword = t("login.passwordsMismatch");
      if (!agreed) errors.terms = t("login.acceptTerms");
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!validate()) return;
    setLoading(true);

    if (mode === "register") {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || t("common.error"));
        setLoading(false);
        return;
      }
      // After registration, show verification message instead of auto-login
      setVerifySent(true);
      setLoading(false);
      return;
    }

    const result = await signIn("credentials", { email: email.trim(), password, redirect: false, callbackUrl: "/dashboard" });
    if (result?.ok) {
      window.location.href = "/dashboard";
    } else if (result?.error) {
      setError(t("login.invalidCredentials"));
      setLoading(false);
    }
  };

  const switchMode = (m: "login" | "register") => {
    setMode(m);
    setError("");
    setFieldErrors({});
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirm(false);
  };

  return (
    <main id="main-content" className="min-h-screen bg-background flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-surface border-r border-ink-3/10 flex-col justify-between p-10">
        <div>
          <Link href="/" className="inline-flex items-center gap-2 no-underline mb-12">
            <Map size={22} className="text-accent" />
            <span className="font-serif text-[22px] font-light text-ink">Canonix</span>
          </Link>
          <h2 className="font-serif text-[38px] font-light text-ink leading-[1.15] mb-4">
            {t("login.brandSlogan1")}<br />{t("login.brandSlogan2")}
          </h2>
          <p className="text-ink-2 text-[19px] leading-relaxed max-w-sm">
            {t("login.brandDesc")}
          </p>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/legal/terms" className="text-[15px] tracking-[0.15em] uppercase text-ink-3 hover:text-accent no-underline">{t("login.terms")}</Link>
          <Link href="/legal/privacy" className="text-[15px] tracking-[0.15em] uppercase text-ink-3 hover:text-accent no-underline">{t("login.privacy")}</Link>
          <Link href="/legal/consent" className="text-[15px] tracking-[0.15em] uppercase text-ink-3 hover:text-accent no-underline">{t("login.consent")}</Link>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-5 sm:px-6 py-8 sm:py-10">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 no-underline mb-3">
              <Map size={22} className="text-accent" />
              <span className="font-serif text-[22px] font-light text-ink">Canonix</span>
            </Link>
          </div>

          {/* Heading */}
          <div className="mb-6">
            <h1 className="font-serif text-[30px] font-light text-ink leading-tight">
              {mode === "login" ? t("login.loginTitle") : t("login.registerTitle")}
            </h1>
            <p className="text-ink-2 text-[18px] mt-1">
              {mode === "login"
                ? t("login.loginSubtitle")
                : t("login.registerSubtitle")
              }</p>
          </div>

          {/* Tab switcher */}
          <div className="flex bg-surface rounded-lg p-[3px] border border-ink-3/10 mb-6">
            <button
              type="button"
              onClick={() => switchMode("login")}
              className={`flex-1 py-2 rounded-md text-[16px] tracking-[0.12em] uppercase transition-all ${
                mode === "login"
                  ? "bg-accent text-white shadow-sm"
                  : "text-ink-3 hover:text-ink"
              }`}
            >
              {t("login.login")}
            </button>
            <button
              type="button"
              onClick={() => switchMode("register")}
              className={`flex-1 py-2 rounded-md text-[16px] tracking-[0.12em] uppercase transition-all ${
                mode === "register"
                  ? "bg-accent text-white shadow-sm"
                  : "text-ink-3 hover:text-ink"
              }`}
            >
              {t("login.register")}
            </button>
          </div>

          {/* Verification sent after registration */}
          {verifySent && (
            <div className="bg-accent-light/30 border border-accent/20 rounded-lg px-4 py-4 mb-4 space-y-3">
              <div className="flex items-start gap-2">
                <Mail size={14} className="text-accent flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-ink text-[18px] font-medium mb-1">{t("login.verificationSent")}</p>
                  <p className="text-ink-2 text-[17px] leading-snug">
                    {t("login.verificationSentDesc", { email })}
                  </p>
                </div>
              </div>
              <button
                onClick={async () => {
                  setResendLoading(true);
                  try {
                    const res = await fetch("/api/auth/verify/resend", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
                    if (res.ok) setError("");
                    else { const d = await res.json(); setError(d.error || t("common.error")); }
                  } catch { setError(t("common.error")); }
                  finally { setResendLoading(false); }
                }}
                disabled={resendLoading}
                className="text-[17px] text-accent hover:text-accent/80 transition-colors disabled:opacity-50"
              >
                {resendLoading ? t("common.loading") : t("login.resend")}
              </button>
              <button
                onClick={() => { setVerifySent(false); setMode("login"); }}
                className="block text-[17px] text-ink-3 hover:text-ink transition-colors"
              >
                {t("login.goToLogin")} →
              </button>
            </div>
          )}

          {/* Need verify — login failed because email not verified */}
          {needVerify && !verifySent && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-4 mb-4 space-y-3">
              <div className="flex items-start gap-2">
                <Mail size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-ink text-[18px] font-medium mb-1">{t("login.emailNotVerifiedTitle")}</p>
                  <p className="text-ink-2 text-[17px] leading-snug">
                    {t("login.verifyEmail", { email })}
                  </p>
                </div>
              </div>
              <button
                onClick={async () => {
                  setResendLoading(true);
                  try {
                    const res = await fetch("/api/auth/verify/resend", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
                    if (res.ok) { setNeedVerify(false); setVerifySent(true); setError(""); }
                    else { const d = await res.json(); setError(d.error || t("common.error")); }
                  } catch { setError(t("common.error")); }
                  finally { setResendLoading(false); }
                }}
                disabled={resendLoading}
                className="text-[17px] text-amber-700 hover:text-amber-800 transition-colors disabled:opacity-50"
              >
                {resendLoading ? t("common.loading") : t("login.resendEmail")}
              </button>
            </div>
          )}

          {/* Verify success message */}
          {searchParams.get("verify") === "success" && !verifySent && (
            <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2.5 mb-4 flex items-start gap-2">
              <Check size={14} className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <p className="text-green-700 dark:text-green-400 text-[17px] leading-snug">{t("login.verifiedSuccess")}</p>
            </div>
          )}

          {/* Global error */}
          {error && (
            <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2.5 mb-4">
              <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-600 dark:text-red-400 text-[17px] leading-snug">{error}</p>
            </div>
          )}

          {/* Form */}
          {!verifySent && (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Name (register only) */}
            {mode === "register" && (
              <div>
                <label htmlFor="name" className="text-[15px] tracking-[0.2em] uppercase text-ink-3 block mb-1.5">{t("settings.name")}</label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={e => { setName(e.target.value); setFieldErrors(f => ({ ...f, name: "" })); }}
                  className={`w-full bg-background border rounded-md px-3 py-2.5 text-[18px] text-ink focus:outline-none focus:border-accent transition-colors ${
                    fieldErrors.name ? "border-red-400" : "border-ink-3/20"
                  }`}
                  placeholder={t("login.namePlaceholder")}
                  autoComplete="name"
                />
                <FieldError message={fieldErrors.name} />
              </div>
            )}

            {/* Email */}
            <div>
              <label htmlFor="email" className="text-[15px] tracking-[0.2em] uppercase text-ink-3 block mb-1.5">{t("settings.email")}</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setFieldErrors(f => ({ ...f, email: "" })); }}
                className={`w-full bg-background border rounded-md px-3 py-2.5 text-[18px] text-ink focus:outline-none focus:border-accent transition-colors ${
                  fieldErrors.email ? "border-red-400" : "border-ink-3/20"
                }`}
                placeholder="you@example.com"
                autoComplete="email"
              />
              <FieldError message={fieldErrors.email} />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="text-[15px] tracking-[0.2em] uppercase text-ink-3 block mb-1.5">{t("login.password")}</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setFieldErrors(f => ({ ...f, password: "" })); }}
                  className={`w-full bg-background border rounded-md px-3 py-2.5 pr-9 text-[18px] text-ink focus:outline-none focus:border-accent transition-colors ${
                    fieldErrors.password ? "border-red-400" : "border-ink-3/20"
                  }`}
                  placeholder={t("login.passwordMin")}
                  autoComplete={mode === "register" ? "new-password" : "current-password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? t("login.hidePassword") : t("login.showPassword")}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <FieldError message={fieldErrors.password} />
              {mode === "register" && <PasswordStrength password={password} />}
            </div>

            {/* Confirm password (register only) */}
            {mode === "register" && (
              <div>
                <label htmlFor="confirmPassword" className="text-[15px] tracking-[0.2em] uppercase text-ink-3 block mb-1.5">{t("login.confirmPassword")}</label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={e => { setConfirmPassword(e.target.value); setFieldErrors(f => ({ ...f, confirmPassword: "" })); }}
                    className={`w-full bg-background border rounded-md px-3 py-2.5 pr-9 text-[18px] text-ink focus:outline-none focus:border-accent transition-colors ${
                      fieldErrors.confirmPassword ? "border-red-400" : confirmPassword && confirmPassword === password ? "border-green-400" : "border-ink-3/20"
                    }`}
                    placeholder={t("login.repeatPassword")}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink transition-colors"
                    tabIndex={-1}
                    aria-label={showConfirm ? t("login.hidePassword") : t("login.showPassword")}
                  >
                    {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  {confirmPassword && (
                    <span className="absolute right-9 top-1/2 -translate-y-1/2">
                      {confirmPassword === password
                        ? <Check size={12} className="text-green-500" />
                        : <X size={12} className="text-red-400" />
                      }
                    </span>
                  )}
                </div>
                <FieldError message={fieldErrors.confirmPassword} />
              </div>
            )}

            {/* Terms (register only) */}
            {mode === "register" && (
              <div>
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={e => { setAgreed(e.target.checked); setFieldErrors(f => ({ ...f, terms: "" })); }}
                    className="mt-0.5 accent-accent rounded"
                  />
                  <span className="text-[17px] text-ink-2 leading-snug">
                    {t("login.acceptTermsPrefix")}{" "}
                    <Link href="/legal/terms" className="text-accent hover:underline no-underline" target="_blank">{t("login.termsOfUse")}</Link>
                    {", "}
                    <Link href="/legal/privacy" className="text-accent hover:underline no-underline" target="_blank">{t("login.privacyPolicy")}</Link>
                    {" " + t("login.and") + " "}
                    <Link href="/legal/consent" className="text-accent hover:underline no-underline" target="_blank">{t("login.dataConsent")}</Link>
                  </span>
                </label>
                <FieldError message={fieldErrors.terms} />
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent text-white rounded-xl px-5 py-3 text-[17px] tracking-[0.12em] uppercase hover:bg-accent/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  {mode === "login" ? t("login.loggingIn") : t("login.creating")}
                </>
              ) : (
                <>
                  {mode === "login" ? t("login.login") : t("login.registerTitle")}
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>
          )}

          {/* Social login divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-ink-3/15" />
            <span className="text-[15px] tracking-[0.2em] uppercase text-ink-3">{t("login.or")}</span>
            <div className="flex-1 h-px bg-ink-3/15" />
          </div>

          {/* Social login buttons */}
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              className="w-full flex items-center justify-center gap-2.5 bg-surface border border-ink-3/15 rounded-xl px-5 py-3 text-[17px] tracking-[0.08em] text-ink hover:border-ink-3/30 hover:shadow-sm transition-all no-underline"
            >
              <GoogleIcon />
              {t("login.continueWithGoogle")}
            </button>
            {/* Telegram bot auth — generates token, opens bot, user returns via link */}
            {telegramLoading ? (
              <div className="w-full bg-[#2AABEE]/8 border border-[#2AABEE]/20 rounded-xl px-5 py-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Loader2 size={14} className="animate-spin text-[#2AABEE]" />
                  <span className="text-[17px] text-[#2AABEE]">{t("login.openTelegram")}</span>
                </div>
                <p className="text-[16px] text-ink-3">
                  {t("login.telegramBotHint")}
                </p>
                <button
                  type="button"
                  onClick={() => setTelegramLoading(false)}
                  className="text-[16px] text-ink-3 hover:text-ink underline mt-2"
                >
                  {t("common.cancel")}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleTelegramLogin}
                className="w-full flex items-center justify-center gap-2.5 bg-[#2AABEE] border border-[#2AABEE]/20 rounded-xl px-5 py-3 text-[17px] tracking-[0.08em] text-white hover:bg-[#229ED9] hover:shadow-sm transition-all no-underline"
              >
                <TelegramIcon />
                {t("login.continueWithTelegram")}
              </button>
            )}
          </div>

          {/* Dev quick-login (only in development) */}
          {process.env.NODE_ENV !== "production" && (
            <>
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-ink-3/15" />
                <span className="text-[13px] tracking-[0.2em] uppercase text-ink-3/50">dev</span>
                <div className="flex-1 h-px bg-ink-3/15" />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    setLoading(true);
                    const devRes = await fetch("/api/auth/dev-login", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ code: process.env.NEXT_PUBLIC_DEV_CODE || "dev", email: "dev@canonix.local" }),
                    });
                    if (devRes.ok) {
                      const devData = await devRes.json();
                      const result = await signIn("credentials", { email: devData.email, password: devData.password, redirect: false, callbackUrl: "/dashboard" });
                      if (result?.ok) window.location.href = "/dashboard";
                    }
                    setLoading(false);
                  }}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-purple-500/10 border border-purple-500/20 rounded-lg px-3 py-2 text-[14px] text-purple-600 hover:bg-purple-500/20 transition-colors disabled:opacity-50"
                >
                  👑 Dev (Corporate)
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setLoading(true);
                    const devRes = await fetch("/api/auth/dev-login", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ code: process.env.NEXT_PUBLIC_DEV_CODE || "dev", email: "tester@canonix.local" }),
                    });
                    if (devRes.ok) {
                      const devData = await devRes.json();
                      const result = await signIn("credentials", { email: devData.email, password: devData.password, redirect: false, callbackUrl: "/pricing" });
                      if (result?.ok) window.location.href = "/pricing";
                    }
                    setLoading(false);
                  }}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 text-[14px] text-amber-600 hover:bg-amber-500/20 transition-colors disabled:opacity-50"
                >
                  🧪 Tester (Free)
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setLoading(true);
                    const devRes = await fetch("/api/auth/dev-login", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ code: process.env.NEXT_PUBLIC_DEV_CODE || "dev", email: "buyer@canonix.local" }),
                    });
                    if (devRes.ok) {
                      const devData = await devRes.json();
                      const result = await signIn("credentials", { email: devData.email, password: devData.password, redirect: false, callbackUrl: "/pricing" });
                      if (result?.ok) window.location.href = "/pricing";
                    }
                    setLoading(false);
                  }}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2 text-[14px] text-green-600 hover:bg-green-500/20 transition-colors disabled:opacity-50"
                >
                  💰 Buyer (100k₽)
                </button>
              </div>
            </>
          )}

          {/* Footer */}
          <p className="text-center text-[16px] text-ink-3 mt-6">
            {mode === "login" ? (
              <>
                {t("login.noAccount")}{" "}
                <button onClick={() => switchMode("register")} className="text-accent hover:underline">
                  {t("login.register")}
                </button>
              </>
            ) : (
              <>
                {t("login.hasAccount")}{" "}
                <button onClick={() => switchMode("login")} className="text-accent hover:underline">
                  {t("login.login")}
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    }>
      <LoginPageInner />
    </Suspense>
  );
}
