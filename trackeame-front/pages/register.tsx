import { useState, FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Link from 'next/link';
import Head from 'next/head';
import OAuthButtons from '../components/OAuthButtons';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await register(email, password, name);
    
    if (!result.success) {
      setError(result.error || 'Registration failed');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-purple-600 to-indigo-700 p-8">
      <Head>
        <title>Registro - Trackeame</title>
      </Head>

      <div className="bg-white p-12 rounded-2xl shadow-2xl w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-900">Create Account</h1>
        
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-6 text-sm border-l-4 border-red-600">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label htmlFor="name" className="font-semibold text-gray-700 text-sm">
              Name (Optional)
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="px-4 py-3 border-2 border-gray-200 rounded-lg text-base transition-all outline-none focus:border-purple-600 focus:ring-4 focus:ring-purple-100"
              placeholder="Your name"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="font-semibold text-gray-700 text-sm">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="px-4 py-3 border-2 border-gray-200 rounded-lg text-base transition-all outline-none focus:border-purple-600 focus:ring-4 focus:ring-purple-100"
              placeholder="your@email.com"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="font-semibold text-gray-700 text-sm">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="px-4 py-3 border-2 border-gray-200 rounded-lg text-base transition-all outline-none focus:border-purple-600 focus:ring-4 focus:ring-purple-100"
              placeholder="••••••••"
              minLength={6}
            />
          </div>

          <button 
            type="submit" 
            className="mt-2 px-6 py-3.5 bg-linear-to-r from-purple-600 to-indigo-700 text-white rounded-lg text-base font-semibold transition-all hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <OAuthButtons />

        <p className="text-center mt-6 text-gray-600 text-sm">
          Already have an account?{' '}
          <Link href="/login" className="text-purple-600 font-semibold hover:underline">
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
}
