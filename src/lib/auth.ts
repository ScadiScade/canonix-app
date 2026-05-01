import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import prisma from "@/lib/prisma";

// In-memory cache for user images (avoids DB hit on every session() call)
const IMAGE_CACHE_TTL = 60_000; // 60s
const imageCache = new Map<string, { image: string | null; ts: number }>();

// Periodic cleanup of expired cache entries
setInterval(() => {
  const now = Date.now();
  const expired: string[] = [];
  imageCache.forEach((v, k) => { if (now - v.ts > IMAGE_CACHE_TTL) expired.push(k); });
  expired.forEach(k => imageCache.delete(k));
}, 60_000);

export function invalidateImageCache(userId: string) {
  imageCache.delete(userId);
}

// Verify Telegram Login Widget auth data
function verifyTelegramAuth(authData: Record<string, string>): { valid: boolean; user: { id: string; name: string; username: string; photo_url: string | null } } | null {
  const { hash, ...rest } = authData;
  if (!hash) return null;

  // Remove next-auth internal fields that shouldn't be part of HMAC
  const internalKeys = new Set(["csrfToken", "callbackUrl", "redirect", "json"]);
  const data: Record<string, string> = {};
  for (const [k, v] of Object.entries(rest)) {
    if (!internalKeys.has(k)) data[k] = v;
  }

  // Verify HMAC signature (generated server-side from bot token)
  const botToken = process.env.TELEGRAM_BOT_TOKEN!;

  // Create check string: sorted key=value pairs joined with \n
  const checkString = Object.keys(data)
    .sort()
    .map(k => `${k}=${data[k]}`)
    .join("\n");

  // HMAC-SHA256 using SHA256(bot_token) as key
  const secretKey = crypto.createHash("sha256").update(botToken).digest();
  const hmac = crypto.createHmac("sha256", secretKey).update(checkString).digest("hex");

  if (hmac !== hash) return null;

  // Check auth_date not too old (within 1 day)
  const authDate = parseInt(data.auth_date || "0", 10) * 1000;
  const oneDay = 86400000;
  if (Date.now() - authDate > oneDay) return null;

  return {
    valid: true,
    user: {
      id: data.id,
      name: [data.first_name, data.last_name].filter(Boolean).join(" "),
      username: data.username || data.id,
      photo_url: data.photo_url || null,
    },
  };
}

// Telegram provider using credentials flow — receives verified Telegram data
function TelegramProvider() {
  return CredentialsProvider({
    id: "telegram",
    name: "Telegram",
    credentials: {
      id: { label: "Telegram ID", type: "text" },
      first_name: { label: "First Name", type: "text" },
      last_name: { label: "Last Name", type: "text" },
      username: { label: "Username", type: "text" },
      photo_url: { label: "Photo URL", type: "text" },
      auth_date: { label: "Auth Date", type: "text" },
      hash: { label: "Hash", type: "text" },
    },
    async authorize(credentials) {
      if (!credentials?.id || !credentials?.hash) return null;

      const result = verifyTelegramAuth(credentials as Record<string, string>);
      if (!result?.valid) return null;

      const email = `${result.user.username}@telegram.user`;

      // Find or create user
      let user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            email,
            name: result.user.name,
            image: result.user.photo_url,
          },
        });
      } else {
        // Update name/image on each login
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            name: result.user.name,
            image: result.user.photo_url,
          },
        });
      }

      return { id: user.id, email: user.email, name: user.name, image: user.image };
    },
  });
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // Dev access: any @canonix.local user can login with DEV_ACCESS_CODE
        const devCode = process.env.DEV_ACCESS_CODE;
        if (devCode && credentials.email.endsWith("@canonix.local") && credentials.password === devCode) {
          const devUser = await prisma.user.findUnique({ where: { email: credentials.email } });
          if (devUser) return { id: devUser.id, email: devUser.email, name: devUser.name };
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) return null;

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) return null;

        // Block login if email not verified
        if (!user.emailVerified) {
          // Throw with specific message so the UI can distinguish this case
          throw new Error("EMAIL_NOT_VERIFIED");
        }

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    TelegramProvider(),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days — persists until user logs out or clears cache
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      // For OAuth providers, ensure user has an email
      if (account?.provider !== "credentials" && !user.email) {
        // Generate placeholder email if none provided
        user.email = `${user.id || Date.now()}@${account?.provider || "oauth"}.user`;
      }
      // Auto-verify email for OAuth users (Google already verified the email)
      if (account?.provider !== "credentials" && user.email && !user.email.endsWith("@telegram.user")) {
        const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
        if (dbUser && !dbUser.emailVerified) {
          await prisma.user.update({ where: { id: dbUser.id }, data: { emailVerified: new Date() } });
        }
      }
      // Update user image from OAuth providers on each sign-in
      if (user.image && user.email && account?.provider !== "credentials" && account?.provider !== "telegram") {
        const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
        if (dbUser && dbUser.image !== user.image) {
          await prisma.user.update({ where: { id: dbUser.id }, data: { image: user.image } });
        }
      }
      return true;
    },
    async jwt({ token, user, trigger }) {
      // On sign-in, persist user data to token
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.hasImage = !!user.image;
        token.email = user.email;
        // Fetch emailVerified from DB on sign-in
        const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
        if (dbUser) {
          token.emailVerified = dbUser.emailVerified;
        }
      }
      // On session update (e.g. profile edit), refresh from DB
      if (trigger === "update") {
        const dbUser = await prisma.user.findUnique({ where: { id: token.id as string } });
        if (dbUser) {
          token.name = dbUser.name;
          token.hasImage = !!dbUser.image;
          token.email = dbUser.email;
          token.emailVerified = dbUser.emailVerified;
        }
      }
      // For OAuth: look up user by email to get the DB id on subsequent requests
      if (!token.id && token.email) {
        const dbUser = await prisma.user.findUnique({ where: { email: token.email } });
        if (dbUser) {
          token.id = dbUser.id;
          token.name = dbUser.name;
          token.hasImage = !!dbUser.image;
          token.emailVerified = dbUser.emailVerified;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.email = token.email as string;
        session.user.emailVerified = token.emailVerified as Date | null;
        // Resolve image: use cached value or fetch from DB with short TTL
        if (token.hasImage) {
          const uid = token.id as string;
          const cached = imageCache.get(uid);
          if (cached && Date.now() - cached.ts < IMAGE_CACHE_TTL) {
            session.user.image = cached.image;
          } else {
            const dbUser = await prisma.user.findUnique({ where: { id: uid }, select: { image: true } });
            session.user.image = dbUser?.image || null;
            imageCache.set(uid, { image: session.user.image, ts: Date.now() });
          }
        } else {
          session.user.image = null;
        }
      }
      return session;
    },
  },
};
