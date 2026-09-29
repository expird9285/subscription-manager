import type { User } from "../lib/types";

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const RENEW_WHEN_REMAINING_MS = 15 * 24 * 60 * 60 * 1000;

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function randomToken(byteLength = 32) {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(byteLength)));
}

async function hashToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function createSession(db: D1Database, userId: string) {
  const token = randomToken();
  const expiresAt = Date.now() + SESSION_TTL_MS;

  await db
    .prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)")
    .bind(await hashToken(token), userId, expiresAt)
    .run();

  return { token, expiresAt };
}

/**
 * Resolves a session token to its user. Sessions are extended (sliding expiry) once less
 * than half of their lifetime remains; `renewedExpiresAt` tells the caller to refresh the cookie.
 */
export async function validateSession(db: D1Database, token: string) {
  const id = await hashToken(token);
  const row = await db
    .prepare(
      `SELECT sessions.expires_at AS session_expires_at, users.*
       FROM sessions JOIN users ON users.id = sessions.user_id
       WHERE sessions.id = ?`,
    )
    .bind(id)
    .first<User & { session_expires_at: number }>();

  if (!row) {
    return null;
  }

  const now = Date.now();
  if (row.session_expires_at <= now) {
    await db.prepare("DELETE FROM sessions WHERE id = ?").bind(id).run();
    return null;
  }

  let renewedExpiresAt: number | null = null;
  if (row.session_expires_at - now < RENEW_WHEN_REMAINING_MS) {
    renewedExpiresAt = now + SESSION_TTL_MS;
    await db
      .prepare("UPDATE sessions SET expires_at = ? WHERE id = ?")
      .bind(renewedExpiresAt, id)
      .run();
  }

  const { session_expires_at: _expiresAt, ...user } = row;
  return { user: user as User, renewedExpiresAt };
}

export async function deleteSession(db: D1Database, token: string) {
  await db.prepare("DELETE FROM sessions WHERE id = ?").bind(await hashToken(token)).run();
}

export async function deleteExpiredSessions(db: D1Database) {
  await db.prepare("DELETE FROM sessions WHERE expires_at <= ?").bind(Date.now()).run();
}
