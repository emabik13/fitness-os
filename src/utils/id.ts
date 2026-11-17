import * as Crypto from 'expo-crypto';

/**
 * RFC 4122 v4 UUID. All synced rows use UUID primary keys (no autoincrement).
 * Uses the platform Web Crypto API when present, otherwise expo-crypto
 * (cryptographically secure on Android/iOS).
 */
export function uuid(): string {
  const webCrypto = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  const id = webCrypto?.randomUUID ? webCrypto.randomUUID() : Crypto.randomUUID();
  if (typeof id !== 'string' || id.length !== 36) throw new Error('No se pudo generar un UUID.');
  return id;
}
