'use client';

import { useStore } from '@/store';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

export default function LandingPage() {
  const { isOnboarded, currentUser } = useStore();
  const router = useRouter();

  // If already logged in, go straight to dashboard
  useEffect(() => {
    if (isOnboarded && currentUser) {
      router.replace('/dashboard');
    }
  }, [isOnboarded, currentUser, router]);

  return (
    <div className="min-h-screen bg-cream max-w-lg mx-auto flex flex-col">
      <div className="flex-1 flex flex-col justify-center px-6">

        {/* Brand */}
        <div className="mb-12">
          <h1 className="font-display font-light text-6xl leading-none tracking-tight mb-2">
            Court<br /><em className="text-accent-deep">Books.</em>
          </h1>
          <p className="font-display font-light italic text-lg text-ink-2 max-w-[28ch] leading-snug">
            Pickleball court booking for Philippine facilities.
          </p>
        </div>

        {/* Value props */}
        <div className="grid grid-cols-2 gap-px bg-line mb-10 border-t border-b border-line">
          <div className="bg-cream py-4 px-3">
            <div className="font-mono text-[8px] tracking-wider uppercase text-ink-3 mb-1">For</div>
            <div className="font-display text-base">Court owners</div>
          </div>
          <div className="bg-cream py-4 px-3">
            <div className="font-mono text-[8px] tracking-wider uppercase text-ink-3 mb-1">Sport</div>
            <div className="font-display text-base">Pickleball</div>
          </div>
          <div className="bg-cream py-4 px-3">
            <div className="font-mono text-[8px] tracking-wider uppercase text-ink-3 mb-1">Setup</div>
            <div className="font-display text-base">5 minutes</div>
          </div>
          <div className="bg-cream py-4 px-3">
            <div className="font-mono text-[8px] tracking-wider uppercase text-ink-3 mb-1">Trial</div>
            <div className="font-display text-base">7 days free</div>
          </div>
        </div>

        {/* CTAs */}
        <div className="space-y-3">
          <Link
            href="/onboarding"
            className="w-full bg-ink text-paper py-4 rounded-lg font-sans text-sm font-medium flex justify-between items-center px-5 block"
          >
            <div>
              <div>Join as Court Owner</div>
              <div className="font-mono text-[9px] text-ink-4 tracking-wider mt-0.5">Start with a 7-day free trial</div>
            </div>
            <span className="font-mono text-lg">→</span>
          </Link>

          <Link
            href="/login"
            className="w-full border border-ink text-ink py-4 rounded-lg font-sans text-sm font-medium flex justify-between items-center px-5 block"
          >
            <div>
              <div>Sign In</div>
              <div className="font-mono text-[9px] text-ink-3 tracking-wider mt-0.5">Already have an account</div>
            </div>
            <span className="font-mono text-lg">→</span>
          </Link>
        </div>

        {/* Demo shortcut */}
        <button
          onClick={() => {
            useStore.getState().resetData();
            router.push('/dashboard');
          }}
          aria-label="Load demo data and skip setup"
          className="w-full mt-4 text-ink-3 py-3 font-mono text-[10px] tracking-wider uppercase"
        >
          Load demo data
        </button>
      </div>

      {/* Footer */}
      <footer className="py-6 text-center">
        <div className="font-mono text-[9px] text-ink-3 tracking-wider uppercase">
          Court Books · PWA · Philippines · ₱
        </div>
      </footer>
    </div>
  );
}
