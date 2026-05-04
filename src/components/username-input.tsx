'use client';

import { useState, useEffect, useRef } from 'react';
import { apiCheckUsername } from '@/lib/api';

interface UsernameInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function UsernameInput({ value, onChange, placeholder = 'e.g. marco', className = '' }: UsernameInputProps) {
  const [status, setStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();

    const trimmed = value.trim();
    if (trimmed.length < 3) {
      setStatus('idle');
      return;
    }

    setStatus('checking');

    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const result = await apiCheckUsername(trimmed);
        if (controller.signal.aborted) return;
        if (result === null) {
          setStatus('idle');
        } else {
          setStatus(result ? 'available' : 'taken');
        }
      } catch {
        if (!controller.signal.aborted) setStatus('idle');
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [value]);

  const handleChange = (val: string) => {
    onChange(val.toLowerCase().replace(/[^a-z0-9_]/g, ''));
  };

  return (
    <div>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="username"
          className={`w-full ${className}`}
        />
        {value.trim().length >= 3 && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            {status === 'checking' && (
              <svg className="w-4 h-4 text-ink-4 animate-spin" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" opacity="0.3" />
                <path d="M14 8a6 6 0 00-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            )}
            {status === 'available' && (
              <svg className="w-4 h-4 text-signal" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 8.5l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            {status === 'taken' && (
              <svg className="w-4 h-4 text-warn" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
              </svg>
            )}
          </span>
        )}
      </div>
      {status === 'taken' && (
        <p className="text-xs text-warn mt-1">This username is already taken</p>
      )}
      {status === 'available' && (
        <p className="text-xs text-signal mt-1">Username is available</p>
      )}
    </div>
  );
}

/** Returns true if the username status is valid for submission. */
export function isUsernameValid(value: string, status: 'idle' | 'checking' | 'available' | 'taken'): boolean {
  return value.trim().length >= 3 && status !== 'taken' && status !== 'checking';
}
