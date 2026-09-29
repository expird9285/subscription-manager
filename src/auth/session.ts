import type { Context, MiddlewareHandler } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";

import { validateSession } from "../db/sessions";
import { isAllowedDiscordId } from "../lib/config";
import type { AppEnv } from "../lib/types";

const SESSION_COOKIE = "sm_session";
const OAUTH_STATE_COOKIE = "sm_oauth";
export const SIDEBAR_COOKIE = "sm_sidebar";

// Over HTTPS the `__Host-` prefix pins cookies to this exact host; plain HTTP is only used by `wrangler dev`.
function isSecure(c: Context) {
  return new URL(c.req.url).protocol === "https:";
}

function prefix(c: Context) {
  return isSecure(c) ? ("host" as const) : undefined;
}

export function setSessionCookie(c: Context, token: string, expiresAt: number) {
  setCookie(c, SESSION_COOKIE, token, {
    path: "/",
    httpOnly: true,
    secure: isSecure(c),
    sameSite: "Lax",
    maxAge: Math.floor((expiresAt - Date.now()) / 1000),
    prefix: prefix(c),
  });
}

export function getSessionToken(c: Context) {
  return getCookie(c, SESSION_COOKIE, prefix(c));
}

export function clearSessionCookie(c: Context) {
  deleteCookie(c, SESSION_COOKIE, { path: "/", secure: isSecure(c), prefix: prefix(c) });
}

type OAuthState = { state: string; next: string };

export function setOAuthStateCookie(c: Context, value: OAuthState) {
  setCookie(c, OAUTH_STATE_COOKIE, JSON.stringify(value), {
    path: "/",
    httpOnly: true,
    secure: isSecure(c),
    sameSite: "Lax",
    maxAge: 600,
    prefix: prefix(c),
  });
}

export function takeOAuthStateCookie(c: Context): OAuthState | null {
  const raw = getCookie(c, OAUTH_STATE_COOKIE, prefix(c));
  deleteCookie(c, OAUTH_STATE_COOKIE, { path: "/", secure: isSecure(c), prefix: prefix(c) });
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<OAuthState>;
    return typeof parsed.state === "string" && typeof parsed.next === "string"
      ? { state: parsed.state, next: parsed.next }
      : null;
  } catch {
    return null;
  }
}

/** Loads the signed-in user or redirects to /login. Re-checks the allowlist on every request. */
export const requireUser: MiddlewareHandler<AppEnv> = async (c, next) => {
  const token = getSessionToken(c);
  const session = token ? await validateSession(c.env.DB, token) : null;

  if (!session || !isAllowedDiscordId(c.env, session.user.discord_id)) {
    const url = new URL(c.req.url);
    const login = new URL("/login", url);
    if (c.req.method === "GET") {
      login.searchParams.set("next", `${url.pathname}${url.search}`);
    }
    if (session) {
      login.searchParams.set("error", "not_allowed");
      login.searchParams.set("discord_id", session.user.discord_id);
    }
    return c.redirect(login.pathname + login.search);
  }

  if (token && session.renewedExpiresAt) {
    setSessionCookie(c, token, session.renewedExpiresAt);
  }

  c.set("user", session.user);
  await next();
};
