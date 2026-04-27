/* In-memory TTL cache. Replace with Vercel KV in production.
   Keys are scoped per-process; cold starts will miss. */

type CacheEntry<T> = { value: T; expiresAt: number };

const store = new Map<string, CacheEntry<unknown>>();

export async function getCached<T>(key: string): Promise<T | null> {
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

export async function setCached<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}
