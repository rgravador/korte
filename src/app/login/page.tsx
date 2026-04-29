'use client';

import { useStore } from '@/store';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { loginOnline, isSupabaseConfigured } from '@/lib/sync';

export default function LoginPage() {
  const { login, currentUser, isOnline, hydrateFromRemote, tenant } = useStore();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentUser) {
      router.replace('/dashboard');
    }
  }, [currentUser, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Try Supabase first when online + configured
    if (isSupabaseConfigured && isOnline) {
      const onlineUser = await loginOnline(username, password);
      if (onlineUser) {
        // Set user in store and hydrate tenant data
        useStore.setState({ currentUser: onlineUser });
        const { hydrateFromSupabase } = await import('@/lib/sync');
        const data = await hydrateFromSupabase(onlineUser.tenantId);
        if (data) {
          hydrateFromRemote(data);
        }
        setLoading(false);
        router.push('/dashboard');
        return;
      }
    }

    // Fall back to local login (offline or Supabase not configured)
    const user = login(username, password);
    setLoading(false);
    if (user) {
      router.push('/dashboard');
    } else {
      setError('Invalid username or password');
    }
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

      {/* Demo accounts — only shown for the seed tenant */}
      {tenant.id === 'tenant-001' && (
        <div className="mt-8 border-t border-line pt-4">
          <p className="font-mono text-[9px] text-ink-3 tracking-wider uppercase mb-2">Demo accounts</p>
          <div className="space-y-1.5">
            <button
              onClick={() => { setUsername('marco'); setPassword('admin123'); }}
              className="w-full bg-paper rounded-card p-3 text-left"
            >
              <div className="font-medium text-sm">Marco Reyes</div>
              <div className="font-mono text-[9px] text-ink-3">tenant_admin · marco / admin123</div>
            </button>
            <button
              onClick={() => { setUsername('lia'); setPassword('staff123'); }}
              className="w-full bg-paper rounded-card p-3 text-left"
            >
              <div className="font-medium text-sm">Lia Santos</div>
              <div className="font-mono text-[9px] text-ink-3">tenant_staff · lia / staff123</div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
