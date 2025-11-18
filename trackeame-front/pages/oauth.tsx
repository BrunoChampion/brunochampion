import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';

export default function OAuthCallback() {
  const router = useRouter();
  const { completeOAuthLogin } = useAuth();
  const [message, setMessage] = useState('Completing your secure login...');
  const [detail, setDetail] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const handledRef = useRef(false);

  useEffect(() => {
    if (!router.isReady || handledRef.current) return;
    handledRef.current = true;

    const { error } = router.query;

    if (typeof error === 'string') {
      setHasError(true);
      setMessage('OAuth login was cancelled or failed. Please try again.');
      return;
    }

    completeOAuthLogin()
      .then((result) => {
        if (!result.success) {
          setHasError(true);
          setMessage('We could not verify your OAuth session.');
          setDetail(result.error || 'Please try starting the login again.');
        }
      })
      .catch((error) => {
        setHasError(true);
        setMessage('Something went wrong while validating your OAuth session.');
        setDetail(error instanceof Error ? error.message : null);
      });
  }, [router.isReady, router.query, completeOAuthLogin]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-purple-600 to-indigo-700 p-8">
      <Head>
        <title>Iniciando Sesión - Trackeame</title>
      </Head>

      <div className="bg-white p-10 rounded-2xl shadow-2xl w-full max-w-md text-center">
        <div className="flex flex-col items-center gap-4">
          {!hasError ? (
            <>
              <div className="w-14 h-14 rounded-full border-4 border-purple-100 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
              </div>
              <p className="text-lg font-semibold text-gray-900">{message}</p>
              <p className="text-sm text-gray-500">You will be redirected automatically once we verify your account.</p>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-full bg-red-50 text-red-600 flex items-center justify-center text-2xl font-bold">
                !
              </div>
              <p className="text-lg font-semibold text-gray-900">We hit a snag</p>
              <p className="text-sm text-gray-500">{message}</p>
              {detail && <p className="text-xs text-gray-500">{detail}</p>}
              <Link
                href="/login"
                className="mt-4 inline-flex items-center justify-center px-6 py-3 bg-linear-to-r from-purple-600 to-indigo-700 text-white rounded-lg text-sm font-semibold"
              >
                Back to login
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
