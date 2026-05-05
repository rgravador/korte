'use client';

import { useStore } from '@/store';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { apiLogin, apiHydrate, apiGetMe } from '@/lib/api';
import Link from 'next/link';
import Image from 'next/image';

const FEATURES = [
  { icon: ZapIcon, title: 'Fast Booking', desc: 'Streamlined workflows for quick court reservations' },
  { icon: ShieldIcon, title: 'Secure & Reliable', desc: 'Enterprise-grade security for your peace of mind' },
  { icon: ChartIcon, title: 'Real-time Analytics', desc: 'Data-driven insights to optimize court utilization' },
  { icon: BuildingIcon, title: 'Multi-facility Ready', desc: 'Scale across multiple courts and locations seamlessly' },
];

const STATS = [
  { value: '500+', label: 'Active Players' },
  { value: '₱2M+', label: 'Bookings Processed' },
  { value: '99.9%', label: 'Uptime' },
];

export default function HomePage() {
  const { currentUser, hydrateFromRemote } = useStore();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [recovering, setRecovering] = useState(true);

  const getHomeRoute = (role: string) => role === 'system_admin' ? '/admin' : '/dashboard';

  useEffect(() => {
    if (currentUser) {
      router.replace(getHomeRoute(currentUser.role));
      return;
    }

    // Auto-recover session only in installed PWA mode (mobile/desktop)
    const isPwa = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as unknown as { standalone?: boolean }).standalone === true;

    if (!isPwa) {
      setRecovering(false);
      return;
    }

    let cancelled = false;
    (async () => {
      const user = await apiGetMe();
      if (cancelled) return;

      if (!user) {
        setRecovering(false);
        return;
      }

      if (user.role !== 'system_admin' && user.tenantId) {
        const data = await apiHydrate(user.tenantId);
        if (cancelled) return;
        if (data) hydrateFromRemote(data);
      }

      useStore.setState({ currentUser: user, isOnboarded: true });
      router.replace(getHomeRoute(user.role));
    })();

    return () => { cancelled = true; };
  }, [currentUser, router, hydrateFromRemote]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const user = await apiLogin(username, password);
    if (!user) {
      setLoading(false);
      setError('Invalid username or password');
      return;
    }

    console.debug('[login] user OK', { id: user.id, tenantId: user.tenantId, role: user.role });

    if (user.role !== 'system_admin') {
      if (!user.tenantId) {
        setLoading(false);
        setError('User has no tenant assigned. Contact your admin.');
        return;
      }

      const data = await apiHydrate(user.tenantId);
      if (!data) {
        setLoading(false);
        setError('Failed to load tenant data. Check your connection and try again.');
        return;
      }

      console.debug('[login] hydrate OK', {
        courts: data.courts.length,
        members: data.members.length,
        bookings: data.bookings.length,
      });

      hydrateFromRemote(data);
    }

    useStore.setState({ currentUser: user, isOnboarded: true });
    setLoading(false);
    router.push(getHomeRoute(user.role));
  };

  if (recovering) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-900">
        <div className="flex flex-col items-center gap-4">
          <Image src="/korte/Korte-no-bg.png" alt="Korte" width={48} height={48} className="w-12 h-12 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-navy-900">
      {/* Left — Login Form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16 xl:px-24">
        <div className="w-full max-w-md mx-auto lg:mx-0">
          {/* Mobile brand — visible only on small screens */}
          <div className="lg:hidden mb-10">
            <div className="flex items-center gap-3">
              <Image src="/korte/Korte-no-bg.png" alt="Korte" width={44} height={44} className="w-11 h-11" />
              <div>
                <span className="text-white font-display font-bold text-xl tracking-tight">Korte</span>
                <span className="text-gold text-[0.6rem] font-semibold tracking-[0.25em] uppercase block">Court Booking Platform</span>
              </div>
            </div>
          </div>

          <h1 className="text-white font-display font-bold text-3xl sm:text-4xl tracking-tight mb-2">
            Welcome back
          </h1>
          <p className="text-slate-400 text-sm mb-10">
            Sign in to continue to your dashboard
          </p>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Username */}
            <div>
              <label className="text-slate-300 text-xs font-medium block mb-2">Username</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                  <UserIcon />
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  autoComplete="username"
                  className="w-full bg-navy-700/60 border border-navy-500/50 rounded-xl pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/40 transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-slate-300 text-xs font-medium block mb-2">Password</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                  <LockIcon />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="w-full bg-navy-700/60 border border-navy-500/50 rounded-xl pl-11 pr-12 py-3.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/40 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>


            {error && (
              <div className="bg-warn/10 border border-warn/20 rounded-lg px-4 py-3">
                <p className="text-warn text-xs">{error}</p>
              </div>
            )}

            {/* Sign In */}
            <button
              type="submit"
              disabled={!username || !password || loading}
              className="w-full bg-primary hover:bg-primary-deep text-white py-4 rounded-xl text-sm font-semibold disabled:opacity-40 transition-all flex items-center justify-center gap-2 group"
            >
              {loading ? 'Signing in...' : (
                <>
                  Sign in
                  <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Join as Court Owner */}
          <div className="mt-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-navy-500/50" />
              <span className="text-slate-500 text-[0.65rem] font-semibold tracking-[0.2em] uppercase">New here?</span>
              <div className="flex-1 h-px bg-navy-500/50" />
            </div>
            <Link
              href="/onboarding"
              className="w-full flex items-center justify-between bg-navy-700/40 hover:bg-navy-700/70 border border-navy-500/30 hover:border-gold/40 rounded-xl py-4 px-5 transition-all group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-lg bg-gold/10 flex items-center justify-center">
                  <CourtIcon className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <span className="text-white font-display text-sm font-semibold block">Join as Court Owner</span>
                  <span className="text-slate-500 text-xs">Start with a 7-day free trial</span>
                </div>
              </div>
              <svg className="w-5 h-5 text-slate-500 group-hover:text-gold transition-all group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>

          {/* Copyright */}
          <p className="text-slate-600 text-xs mt-10">
            &copy; 2026 Korte. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right — Hero Branding (hidden on mobile) */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-gradient-to-br from-navy-800 via-navy-700 to-navy-900 flex-col justify-center px-16 xl:px-24">
        {/* Decorative corner */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-primary/5 rounded-bl-[120px]" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gold/5 rounded-tr-[80px]" />

        {/* Brand */}
        <div className="relative z-10 max-w-lg">
          <div className="flex items-center gap-5 mb-10">
            <Image src="/korte/Korte-no-bg.png" alt="Korte" width={64} height={64} className="w-16 h-16" />
            <div>
              <h2 className="text-white font-display font-bold text-3xl tracking-tight">Korte</h2>
              <span className="text-gold text-[0.65rem] font-semibold tracking-[0.25em] uppercase">Court Booking Platform</span>
            </div>
          </div>

          {/* Hero Copy */}
          <h3 className="text-white font-display font-bold text-4xl xl:text-5xl leading-tight tracking-tight mb-5">
            Streamline Your<br />
            Court Operations<br />
            <span className="text-gold font-display italic">With Smart Booking</span>
          </h3>
          <p className="text-slate-400 text-base leading-relaxed mb-12 max-w-md">
            A modern multi-facility platform designed to manage your pickleball courts from booking to check-in.
          </p>

          {/* Features Grid */}
          <div className="grid grid-cols-2 gap-x-10 gap-y-7 mb-14">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-navy-600/80 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <h4 className="text-white font-display text-sm font-semibold mb-0.5">{title}</h4>
                  <p className="text-slate-500 text-xs leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="h-px bg-navy-500/40 mb-8" />

          {/* Trust Stats */}
          <p className="text-slate-500 text-[0.65rem] font-semibold tracking-[0.2em] uppercase mb-5">
            Trusted by facilities nationwide
          </p>
          <div className="flex gap-10">
            {STATS.map(({ value, label }, i) => (
              <div key={label} className="flex items-start gap-6">
                <div>
                  <p className="text-white font-display font-bold text-3xl tracking-tight">{value}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{label}</p>
                </div>
                {i < STATS.length - 1 && (
                  <div className="w-px h-12 bg-navy-500/50 self-center" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom logo mark */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 opacity-20">
          <Image src="/korte/Korte-no-bg.png" alt="" width={32} height={32} className="w-8 h-8" />
        </div>
      </div>
    </div>
  );
}

/* ─── Inline SVG Icons ─── */

function UserIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 20 20" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="10" cy="7" r="4" />
      <path d="M2 18a8 8 0 0116 0" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 20 20" stroke="currentColor" strokeWidth={1.5}>
      <rect x="4" y="9" width="12" height="8" rx="2" />
      <path d="M7 9V6a3 3 0 016 0v3" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 20 20" stroke="currentColor" strokeWidth={1.5}>
      <path d="M1 10s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" />
      <circle cx="10" cy="10" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 20 20" stroke="currentColor" strokeWidth={1.5}>
      <path d="M1 10s3.5-6 9-6c1.5 0 2.9.4 4.1 1M19 10s-1.4 2.4-3.7 4M7.6 14.4A9.5 9.5 0 011 10" />
      <path d="M12.4 12.4A3 3 0 017.6 7.6" />
      <path d="M2 2l16 16" strokeLinecap="round" />
    </svg>
  );
}

function CourtIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 20 20" stroke="currentColor" strokeWidth={1.5}>
      <rect x="1" y="3" width="18" height="14" rx="2" />
      <line x1="10" y1="3" x2="10" y2="17" />
      <line x1="1" y1="10" x2="19" y2="10" />
      <circle cx="10" cy="10" r="3" />
    </svg>
  );
}

function ZapIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M11 1L4 11h5l-1 8 7-10h-5l1-8z" />
    </svg>
  );
}

function ShieldIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 20 20" stroke="currentColor" strokeWidth={1.5}>
      <path d="M10 1l7 3v5c0 4.4-3 7.7-7 9-4-1.3-7-4.6-7-9V4l7-3z" />
      <path d="M7 10l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChartIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 20 20" stroke="currentColor" strokeWidth={1.5}>
      <path d="M2 18h16" />
      <path d="M4 14V9M8 14V6M12 14V8M16 14V4" strokeLinecap="round" />
    </svg>
  );
}

function BuildingIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 20 20" stroke="currentColor" strokeWidth={1.5}>
      <rect x="2" y="4" width="7" height="14" rx="1" />
      <rect x="11" y="8" width="7" height="10" rx="1" />
      <path d="M5 7v1M5 11v1M5 15v1M14 11v1M14 15v1" strokeLinecap="round" />
    </svg>
  );
}
