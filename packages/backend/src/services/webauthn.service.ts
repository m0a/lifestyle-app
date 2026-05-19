import { and, eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import type { Database } from '../db';
import { passkeyCredentials, webauthnChallenges } from '../db/schema/webauthn';
import type { PasskeyCredential, WebAuthnChallenge } from '../db/schema/webauthn';

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

export async function saveChallenge(
  db: Database,
  params: {
    userId: string | null;
    challenge: string;
    type: 'registration' | 'authentication';
  },
): Promise<void> {
  const now = new Date();
  await db.insert(webauthnChallenges).values({
    id: uuidv4(),
    userId: params.userId,
    challenge: params.challenge,
    type: params.type,
    expiresAt: new Date(now.getTime() + CHALLENGE_TTL_MS).toISOString(),
    createdAt: now.toISOString(),
  });
}

export async function getAndDeleteChallenge(
  db: Database,
  challenge: string,
): Promise<WebAuthnChallenge | null> {
  const row = await db
    .select()
    .from(webauthnChallenges)
    .where(eq(webauthnChallenges.challenge, challenge))
    .get();

  if (!row) return null;

  await db
    .delete(webauthnChallenges)
    .where(eq(webauthnChallenges.challenge, challenge))
    .run();

  if (new Date(row.expiresAt).getTime() < Date.now()) {
    return null;
  }

  return row;
}

export async function saveCredential(
  db: Database,
  userId: string,
  cred: {
    credentialId: string;
    publicKey: string;
    counter: number;
    deviceType: string;
    backedUp: boolean;
    transports?: string[];
    name?: string;
  },
): Promise<PasskeyCredential> {
  const id = uuidv4();
  const createdAt = new Date().toISOString();
  await db.insert(passkeyCredentials).values({
    id,
    userId,
    credentialId: cred.credentialId,
    publicKey: cred.publicKey,
    counter: cred.counter,
    deviceType: cred.deviceType,
    backedUp: cred.backedUp ? 1 : 0,
    transports: cred.transports ? JSON.stringify(cred.transports) : null,
    name: cred.name ?? null,
    lastUsedAt: null,
    createdAt,
  });

  const inserted = await db
    .select()
    .from(passkeyCredentials)
    .where(eq(passkeyCredentials.id, id))
    .get();
  if (!inserted) throw new Error('Failed to insert credential');
  return inserted;
}

export async function getCredentialsByUserId(
  db: Database,
  userId: string,
): Promise<PasskeyCredential[]> {
  return db
    .select()
    .from(passkeyCredentials)
    .where(eq(passkeyCredentials.userId, userId))
    .all();
}

export async function getCredentialByCredentialId(
  db: Database,
  credentialId: string,
): Promise<PasskeyCredential | null> {
  const row = await db
    .select()
    .from(passkeyCredentials)
    .where(eq(passkeyCredentials.credentialId, credentialId))
    .get();
  return row ?? null;
}

export async function updateCredentialCounter(
  db: Database,
  credentialId: string,
  newCounter: number,
): Promise<void> {
  await db
    .update(passkeyCredentials)
    .set({ counter: newCounter, lastUsedAt: new Date().toISOString() })
    .where(eq(passkeyCredentials.credentialId, credentialId))
    .run();
}

export async function deleteCredential(
  db: Database,
  credentialId: string,
  userId: string,
): Promise<boolean> {
  const result = await db
    .delete(passkeyCredentials)
    .where(
      and(
        eq(passkeyCredentials.credentialId, credentialId),
        eq(passkeyCredentials.userId, userId),
      ),
    )
    .run();
  return (result.meta?.changes ?? 0) > 0;
}

export function base64urlToUint8Array(b64url: string): Uint8Array {
  const base64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function uint8ArrayToBase64url(arr: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < arr.length; i += 1) {
    binary += String.fromCharCode(arr[i]!);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
