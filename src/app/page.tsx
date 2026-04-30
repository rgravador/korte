'use client';

import { useStore } from '@/store';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

export default function LandingPage() {
  const { currentUser } = useStore();
  const router = useRouter();

  // If already logged in, go to the right place
  useEffect(() => {
    if (currentUser) {
      router.replace(currentUser.role === 'system_admin' ? '/admin' : '/dashboard');
    }
  }, [currentUser, router]);

  return (
    <div className="min-h-screen bg-surface-2 max-w-lg mx-auto flex flex-col">
      <div className="flex-1 flex flex-col justify-center px-6">

        {/* Brand */}
        <div className="mb-12">
          <h1 className="font-sans font-bold text-3xl leading-none tracking-tight mb-2">
            Court Books<span className="text-primary">.</span>
          </h1>
          <p className="font-sans text-lg text-ink-2 max-w-[28ch] leading-snug">
            Pickleball court booking for Philippine facilities.
          </p>
        </div>

        {/* Value props */}
        <div className="grid grid-cols-2 gap-3 mb-10">
          <div className="bg-white shadow-card rounded-[16px] py-4 px-3">
            <div className="font-sans text-xs text-ink-3 mb-1">For</div>
            <div className="font-sans font-semibold text-base">Court owners</div>
          </div>
          <div className="bg-white shadow-card rounded-[16px] py-4 px-3">
            <div className="font-sans text-xs text-ink-3 mb-1">Sport</div>
            <div className="font-sans font-semibold text-base">Pickleball</div>
          </div>
          <div className="bg-white shadow-card rounded-[16px] py-4 px-3">
            <div className="font-sans text-xs text-ink-3 mb-1">Setup</div>
            <div className="font-sans font-semibold text-base">5 minutes</div>
          </div>
          <div className="bg-white shadow-card rounded-[16px] py-4 px-3">
            <div className="font-sans text-xs text-ink-3 mb-1">Trial</div>
            <div className="font-sans font-semibold text-base">7 days free</div>
          </div>
        </div>

        {/* CTAs */}
        <div className="space-y-3">
          <Link
            href="/onboarding"
            className="w-full bg-primary text-white py-4 rounded-xl font-sans text-sm font-medium flex justify-between items-center px-5 block"
          >
            <div>
              <div>Join as Court Owner</div>
              <div className="font-sans text-xs text-ink-4 mt-0.5">Start with a 7-day free trial</div>
            </div>
            <span className="font-sans text-lg">&rarr;</span>
          </Link>

          <Link
            href="/login"
            className="w-full bg-surface-3 text-ink-2 py-4 rounded-xl font-sans text-sm font-medium flex justify-between items-center px-5 block"
          >
            <div>
              <div>Sign In</div>
              <div className="font-sans text-xs text-ink-3 mt-0.5">Already have an account</div>
            </div>
            <span className="font-sans text-lg">&rarr;</span>
          </Link>
        </div>

      </div>

      {/* Footer */}
      <footer className="py-6 text-center">
        <div className="font-sans text-xs text-ink-3">
          Court Books · PWA · Philippines · ₱
        </div>
      </footer>
    </div>
  );
}
