/**
 * AES-256-GCM encrypted storage adapter.
 *
 * Wraps any browser Storage (sessionStorage / localStorage) so that persisted
 * values are encrypted at rest. The key is derived from a static secret baked
 * into the bundle — this prevents casual inspection of DevTools storage but
 * does NOT protect against a determined attacker who can read the JS source.
 */

import type { StateStorage } from 'zustand/middleware';

const KEY_MATERIAL = process.env.NEXT_PUBLIC_STORAGE_KEY ?? 'korte-default-storage-v1';

let cachedKey: CryptoKey | null = null;

async function getKey(): Promise<CryptoKey> {
  if (!cachedKey) {
    const hash = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(KEY_MATERIAL),
    );
    cachedKey = await crypto.subtle.importKey(
      'raw', hash, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'],
    );
  }
  return cachedKey;
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function encrypt(plaintext: string): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext),
  );
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return uint8ToBase64(combined);
}

export async function decrypt(encoded: string): Promise<string> {
  const key = await getKey();
  const combined = base64ToUint8(encoded);
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext,
  );
  return new TextDecoder().decode(plaintext);
}

/**
 * Creates a Zustand-compatible StateStorage that encrypts/decrypts values
 * using AES-256-GCM before writing to the underlying browser Storage.
 */
export function createEncryptedStorage(storage: Storage): StateStorage {
  return {
    getItem: async (name: string): Promise<string | null> => {
      const value = storage.getItem(name);
      if (!value) return null;
      try {
        return await decrypt(value);
      } catch {
        // Old unencrypted data or corrupted — clear and let the app re-hydrate
        storage.removeItem(name);
        return null;
      }
    },
    setItem: async (name: string, value: string): Promise<void> => {
      const encrypted = await encrypt(value);
      storage.setItem(name, encrypted);
    },
    removeItem: (name: string): void => {
      storage.removeItem(name);
    },
  };
}
