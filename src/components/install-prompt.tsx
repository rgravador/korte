'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'korte-install-dismissed';
const DISMISS_DURATION_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

function wasDismissedRecently(): boolean {
  if (typeof window === 'undefined') return true;
  const raw = localStorage.getItem(DISMISSED_KEY);
  if (!raw) return false;
  const ts = Number(raw);
  return Date.now() - ts < DISMISS_DURATION_MS;
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Already installed or dismissed recently
    if (isStandalone() || wasDismissedRecently()) return;

    // Detect iOS (no beforeinstallprompt support)
    const ua = navigator.userAgent;
    const isiOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    if (isiOS) {
      setIsIOS(true);
      setShowPrompt(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setShowPrompt(false);
    setDeferredPrompt(null);
  }, []);

  if (!showPrompt) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[100] bg-ink/40 backdrop-blur-sm" onClick={handleDismiss} />

      {/* Prompt */}
      <div className="fixed inset-x-4 bottom-4 z-[101] sm:inset-x-auto sm:bottom-6 sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-sm">
        <div className="bg-surface rounded-2xl shadow-dropdown p-5">
          {/* App info */}
          <div className="flex items-center gap-3.5 mb-4">
            <Image
              src="/logos/Korte-no-bg.png"
              alt="Korte"
              width={52}
              height={52}
              className="w-13 h-13 rounded-xl"
            />
            <div>
              <h3 className="font-display font-bold text-base text-ink">Korte</h3>
              <p className="text-xs text-ink-3 mt-0.5">courtbooks.app</p>
            </div>
          </div>

          {/* Message */}
          <p className="text-sm text-ink-2 mb-5 leading-relaxed">
            Install Korte for a faster, full-screen experience with offline support.
          </p>

          {isIOS ? (
            /* iOS instructions */
            <div className="bg-surface-2 rounded-xl p-3.5 mb-4">
              <p className="text-xs text-ink-2 leading-relaxed">
                Tap the <span className="inline-flex items-center align-middle mx-0.5">
                  <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                    <rect x="3" y="14" width="18" height="7" rx="2" />
                    <path d="M8 5l4-3 4 3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span> Share button, then <strong>Add to Home Screen</strong>.
              </p>
            </div>
          ) : (
            /* Android / Desktop install button */
            <button
              onClick={handleInstall}
              className="w-full bg-primary hover:bg-primary-deep text-white py-3.5 rounded-xl text-sm font-semibold transition-colors mb-3 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v10M8 12l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round" />
              </svg>
              Install App
            </button>
          )}

          {/* Dismiss */}
          <button
            onClick={handleDismiss}
            className="w-full text-center text-xs text-ink-3 font-medium py-2 hover:text-ink-2 transition-colors"
          >
            Not now
          </button>
        </div>
      </div>
    </>
  );
}
