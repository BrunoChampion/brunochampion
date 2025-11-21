import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import type { BetterAuthOptions } from 'better-auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const serverPort = Number(process.env.PORT ?? 4000);
const basePath = '/api/auth';
const rawBaseURL = process.env.BETTER_AUTH_URL || `http://localhost:${serverPort}`;
const baseURL = `${trimTrailingSlash(rawBaseURL)}${basePath}`;
const secret = process.env.BETTER_AUTH_SECRET || 'better-auth-development-secret';
const frontendBaseURL = process.env.FRONTEND_TRACKEAME_URL || 'http://localhost:3001';

const socialProviders = buildSocialProviders();
const trustedOrigins = buildTrustedOrigins(frontendBaseURL);
const isProduction = process.env.NODE_ENV === 'production';
const cookieDomain = process.env.AUTH_COOKIE_DOMAIN?.trim();
const enableCrossDomainCookies = Boolean(cookieDomain);
const cookieCacheMaxAge = Number(process.env.AUTH_SESSION_CACHE_MAX_AGE ?? 300);

const advancedCookies: BetterAuthOptions['advanced'] = {
  useSecureCookies: isProduction,
  defaultCookieAttributes: {
    sameSite: isProduction ? 'none' : 'lax',
  },
  ...(enableCrossDomainCookies
    ? {
        crossSubDomainCookies: {
          enabled: true,
          domain: cookieDomain!,
        },
      }
    : {}),
};

const sessionConfig: BetterAuthOptions['session'] = {
  cookieCache: {
    enabled: true,
    maxAge: cookieCacheMaxAge > 0 ? cookieCacheMaxAge : 300,
  },
};

export const oauthRedirectTargets = buildOAuthTargets(frontendBaseURL);
export const betterAuthBaseURL = baseURL;
export const frontendURL = frontendBaseURL;

export const auth = betterAuth({
  baseURL,
  secret,
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
  },
  session: sessionConfig,
  advanced: advancedCookies,
  ...(trustedOrigins ? { trustedOrigins } : {}),
  ...(socialProviders ? { socialProviders } : {}),
});

process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

function buildSocialProviders(): BetterAuthOptions['socialProviders'] | undefined {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const githubClientId = process.env.GITHUB_CLIENT_ID;
  const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;

  const providers: NonNullable<BetterAuthOptions['socialProviders']> = {};

  if (googleClientId && googleClientSecret) {
    providers.google = {
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      scope: ['profile', 'email'],
    };
  }

  if (githubClientId && githubClientSecret) {
    providers.github = {
      clientId: githubClientId,
      clientSecret: githubClientSecret,
      scope: ['read:user', 'user:email'],
    };
  }

  return Object.keys(providers).length ? providers : undefined;
}

function buildTrustedOrigins(frontendUrl: string): string[] | undefined {
  const origins = new Set<string>();
  const normalizedFrontend = normalizeOrigin(frontendUrl);
  if (normalizedFrontend) {
    origins.add(normalizedFrontend);
  }

  const extraOrigins = process.env.BETTER_AUTH_EXTRA_TRUSTED_ORIGINS || process.env.BETTER_AUTH_ADDITIONAL_TRUSTED_ORIGINS;
  extraOrigins?.split(',').map((origin) => origin.trim()).filter(Boolean).forEach((origin) => {
    const normalizedOrigin = normalizeOrigin(origin);
    if (normalizedOrigin) {
      origins.add(normalizedOrigin);
    }
  });

  return origins.size ? Array.from(origins) : undefined;
}

function buildOAuthTargets(frontendUrl: string) {
  const base = trimTrailingSlash(frontendUrl || 'http://localhost:3001');
  return {
    success: `${base}/oauth`,
    error: `${base}/login?oauth_error=1`,
    newUser: `${base}/register?welcome=1`,
  };
}

function normalizeOrigin(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  try {
    const parsed = new URL(value);
    return parsed.origin;
  } catch {
    return undefined;
  }
}

function trimTrailingSlash(input: string): string {
  return input.replace(/\/+$/, '');
}

export type AuthInstance = typeof auth;
