import { env, exports } from "cloudflare:workers";
import { vi } from "vitest";

import { createSession } from "../src/db/sessions";
import { setState } from "../src/db/state";
import { upsertDiscordUser } from "../src/db/users";
import { ALLOWED_ID, TEST_DISCORD_PRIVATE_JWK } from "./fixtures";

export const BASE = "http://localhost";

export async function resetDb() {
  await env.DB.batch(
    [
      "notification_logs",
      "subscriptions",
      "payment_cards",
      "bank_accounts",
      "sessions",
      "users",
      "app_state",
    ].map((table) =>
      env.DB.prepare(`DELETE FROM ${table}`),
    ),
  );
}

/** Stores a fresh exchange-rate snapshot so page renders never hit the network. */
export async function seedRates() {
  await setState(env.DB, "exchange_rates", {
    date: "2026-09-28",
    krwPerUnit: { USD: 1400, EUR: 1500 },
    source: "live",
    fetchedAt: new Date().toISOString(),
  });
}

export async function signIn(discordId = ALLOWED_ID) {
  const user = await upsertDiscordUser(env.DB, {
    id: discordId,
    username: `user_${discordId.slice(0, 4)}`,
    global_name: "테스터",
  });
  const { token } = await createSession(env.DB, user.id);
  return { user, cookie: `sm_session=${token}` };
}

type RequestOptions = RequestInit & { cookie?: string };

export function request(path: string, options: RequestOptions = {}) {
  const { cookie, headers: initHeaders, ...init } = options;
  const headers = new Headers(initHeaders);
  if (cookie) {
    headers.set("cookie", cookie);
  }
  return exports.default.fetch(new Request(new URL(path, BASE), { ...init, headers, redirect: "manual" }));
}

export function postForm(
  path: string,
  data: Record<string, string>,
  options: { cookie?: string; origin?: string | null } = {},
) {
  const headers = new Headers({ "content-type": "application/x-www-form-urlencoded" });
  if (options.origin !== null) {
    headers.set("origin", options.origin ?? BASE);
  }
  return request(path, {
    method: "POST",
    body: new URLSearchParams(data).toString(),
    headers,
    cookie: options.cookie,
  });
}

export function validSubscriptionForm(overrides: Record<string, string> = {}) {
  return {
    name: "Netflix",
    category: "영상",
    price: "17000",
    split_count: "4",
    currency: "KRW",
    billing_cycle: "monthly",
    next_billing_date: "2026-10-03",
    payment_method: "카드",
    status: "active",
    auto_renew: "on",
    memo: "가족 요금제",
    ...overrides,
  };
}

function toHex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function signedInteraction(body: unknown, timestamp = Math.floor(Date.now() / 1000)) {
  const key = await crypto.subtle.importKey("jwk", TEST_DISCORD_PRIVATE_JWK, { name: "Ed25519" }, false, [
    "sign",
  ]);
  const payload = JSON.stringify(body);
  const signature = await crypto.subtle.sign(
    "Ed25519",
    key,
    new TextEncoder().encode(`${timestamp}${payload}`),
  );
  return request("/discord/interactions", {
    method: "POST",
    body: payload,
    headers: {
      "content-type": "application/json",
      "x-signature-ed25519": toHex(signature),
      "x-signature-timestamp": String(timestamp),
    },
  });
}

type FetchHandler = (url: URL, init: RequestInit | undefined) => Response | Promise<Response>;

/** Routes outbound fetches from the Worker (same isolate) to test handlers. */
export function mockFetch(handler: FetchHandler) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    return handler(url, init);
  });
}
