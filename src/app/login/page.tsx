'use client';

import { useStore } from '@/store';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { apiLogin, apiHydrate } from '@/lib/api';

export default function LoginPage() {
  const { currentUser, hydrateFromRemote } = useStore();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const getHomeRoute = (role: string) => role === 'system_admin' ? '/admin' : '/dashboard';

  useEffect(() => {
    if (currentUser) {
      router.replace(getHomeRoute(currentUser.role));
    }
  }, [currentUser, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Authenticate via API route (server-side, uses service_role key)
    const user = await apiLogin(username, password);
    if (user) {
      useStore.setState({ currentUser: user, isOnboarded: true });

      // Hydrate tenant data (skip for system_admin — they view all tenants)
      if (user.role !== 'system_admin') {
        const data = await apiHydrate(user.tenantId);
        if (data) {
          hydrateFromRemote(data);
        }
      }

      setLoading(false);
      router.push(getHomeRoute(user.role));
      return;
    }

    setLoading(false);
    setError('Invalid username or password');
  };

  return (
    <div className="min-h-screen bg-cream max-w-lg mx-auto flex flex-col justify-center px-5">
      <div className="font-display font-normal italic text-lg tracking-tight mb-8">
        Court<span className="text-accent-deep not-italic">.</span>
      </div>

      <h1 className="font-display font-light text-3xl tracking-tight mb-1">
        Welcome <em className="text-accent-deep">back.</em>
      </h1>
      <p className="font-mono text-[9px] text-ink-3 tracking-wider uppercase mb-8">
        Sign in to manage your facility
      </p>

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="font-mono text-[8px] text-ink-3 tracking-wider uppercase block mb-1.5">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username"
            autoComplete="username"
            className="w-full bg-paper rounded-lg px-4 py-3 text-sm font-sans border border-line focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink"
          />
        </div>

        <div>
          <label className="font-mono text-[8px] text-ink-3 tracking-wider uppercase block mb-1.5">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            autoComplete="current-password"
            className="w-full bg-paper rounded-lg px-4 py-3 text-sm font-sans border border-line focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink"
          />
        </div>

        {error && (
          <p className="text-warn text-xs font-mono">{error}</p>
        )}

        <button
          type="submit"
          disabled={!username || !password || loading}
          className="w-full bg-ink text-paper py-4 rounded-lg font-sans text-sm font-medium disabled:opacity-40"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

    </div>
  );
}
