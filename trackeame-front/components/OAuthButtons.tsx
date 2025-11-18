import React, { useMemo, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const AUTH_BASE = `${API_BASE.replace(/\/$/, '')}/api/auth`;

const providers = [
  {
    id: 'google',
    label: 'Continue with Google',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M23.52 12.273c0-.851-.076-1.67-.218-2.455H12v4.642h6.472c-.279 1.5-1.126 2.773-2.399 3.626v3.013h3.877c2.27-2.09 3.57-5.17 3.57-8.826z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.24 0 5.953-1.073 7.937-2.901l-3.877-3.013c-1.073.72-2.449 1.148-4.06 1.148-3.123 0-5.768-2.107-6.713-4.946H1.288v3.11C3.261 21.316 7.31 24 12 24z"
        />
        <path
          fill="#FBBC05"
          d="M5.287 14.288a7.214 7.214 0 0 1 0-4.576V6.6H1.288a12.003 12.003 0 0 0 0 10.8l3.999-3.112z"
        />
        <path
          fill="#EA4335"
          d="M12 4.75c1.763 0 3.348.607 4.595 1.797l3.448-3.448C17.953 1.098 15.24 0 12 0 7.31 0 3.26 2.684 1.288 6.6l3.999 3.112C6.232 6.856 8.877 4.75 12 4.75z"
        />
      </svg>
    ),
  },
  {
    id: 'github',
    label: 'Continue with GitHub',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 .5C5.648.5.5 5.648.5 12c0 5.086 3.292 9.393 7.865 10.915.575.1.785-.25.785-.555 0-.274-.01-1-.015-1.96-3.2.695-3.876-1.543-3.876-1.543-.523-1.328-1.277-1.683-1.277-1.683-1.044-.714.08-.7.08-.7 1.155.081 1.763 1.187 1.763 1.187 1.028 1.763 2.697 1.254 3.356.959.103-.745.402-1.254.731-1.543-2.554-.291-5.238-1.277-5.238-5.683 0-1.255.448-2.28 1.183-3.084-.119-.29-.513-1.462.112-3.05 0 0 .967-.31 3.168 1.178a10.94 10.94 0 0 1 5.77 0c2.2-1.488 3.166-1.178 3.166-1.178.626 1.588.232 2.76.114 3.05.736.804 1.182 1.829 1.182 3.084 0 4.418-2.69 5.389-5.254 5.675.414.357.783 1.07.783 2.158 0 1.559-.014 2.816-.014 3.2 0 .307.208.665.79.552C20.71 21.39 24 17.084 24 12 24 5.648 18.852.5 12 .5z"
        />
      </svg>
    ),
  },
];

type OAuthResponse =
  | {
      redirect: boolean;
      url?: string;
      token?: string;
      user?: unknown;
    }
  | { message?: string };

export const OAuthButtons: React.FC = () => {
  const [activeProvider, setActiveProvider] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const callbackTargets = useMemo(() => {
    if (typeof window === 'undefined') {
      return {
        success: '/oauth',
        error: '/login?oauth_error=1',
        newUser: '/register?welcome=1',
      };
    }

    const origin = window.location.origin;
    return {
      success: `${origin}/oauth`,
      error: `${origin}/login?oauth_error=1`,
      newUser: `${origin}/register?welcome=1`,
    };
  }, []);

  const handleOAuthRedirect = async (providerId: string) => {
    if (typeof window === 'undefined' || activeProvider) return;

    setErrorMessage(null);
    setActiveProvider(providerId);

    try {
      const response = await fetch(`${AUTH_BASE}/sign-in/social`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          provider: providerId,
          callbackURL: callbackTargets.success,
          errorCallbackURL: callbackTargets.error,
          newUserCallbackURL: callbackTargets.newUser,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as OAuthResponse;

      if (!response.ok) {
        const message = 'message' in payload && payload.message ? payload.message : 'Unable to start OAuth flow';
        throw new Error(message);
      }

      if ('url' in payload && payload.url) {
        window.location.href = payload.url;
        return;
      }

      if ('token' in payload && payload.token) {
        window.location.href = callbackTargets.success;
        return;
      }

      throw new Error('Unexpected response from auth server.');
    } catch (error) {
      console.error('[OAuth] failed to initiate social sign-in', error);
      setErrorMessage(error instanceof Error ? error.message : 'Unable to start OAuth flow');
      setActiveProvider(null);
    }
  };

  return (
    <div className="mt-8">
      <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-4">
        <span className="h-px bg-gray-200 flex-1" />
        <span>Or continue with</span>
        <span className="h-px bg-gray-200 flex-1" />
      </div>
      <div className="flex flex-col gap-3">
        {providers.map((provider) => (
          <button
            key={provider.id}
            type="button"
            onClick={() => handleOAuthRedirect(provider.id)}
            className="flex items-center justify-center gap-3 border-2 border-gray-200 rounded-lg px-4 py-3 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all disabled:opacity-60"
            disabled={activeProvider === provider.id}
          >
            {provider.icon}
            <span>
              {activeProvider === provider.id ? 'Redirecting…' : provider.label}
            </span>
          </button>
        ))}
      </div>

      {errorMessage && (
        <p className="mt-4 text-sm text-red-600 text-center">
          {errorMessage}
        </p>
      )}
    </div>
  );
};

export default OAuthButtons;
