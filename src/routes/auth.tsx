import { Hono } from "hono";

import {
  buildAuthorizeUrl,
  callbackUrl,
  exchangeCode,
  fetchDiscordProfile,
  revokeToken,
} from "../auth/discord-oauth";
import {
  clearSessionCookie,
  getSessionToken,
  setOAuthStateCookie,
  setSessionCookie,
  takeOAuthStateCookie,
} from "../auth/session";
import { createSession, deleteSession, randomToken, validateSession } from "../db/sessions";
import { upsertDiscordUser } from "../db/users";
import { discordConfig, isAllowedDiscordId } from "../lib/config";
import type { AppEnv } from "../lib/types";
import { safeRedirectPath } from "../lib/validation";
import { LoginPage } from "../views/pages/login";
import { renderDocument } from "../views/render";

function loginRedirect(error: string, extra: Record<string, string> = {}) {
  const params = new URLSearchParams({ error, ...extra });
  return `/login?${params.toString()}`;
}

export const loginRoutes = new Hono<AppEnv>().get("/", async (c) => {
  const token = getSessionToken(c);
  const session = token ? await validateSession(c.env.DB, token) : null;
  const error = c.req.query("error");

  if (session && !error && isAllowedDiscordId(c.env, session.user.discord_id)) {
    return c.redirect(safeRedirectPath(c.req.query("next")));
  }

  return renderDocument(
    c,
    <LoginPage
      error={error}
      discordId={c.req.query("discord_id")}
      next={safeRedirectPath(c.req.query("next"))}
    />,
  );
});

export const authRoutes = new Hono<AppEnv>()
  .get("/discord", (c) => {
    const { clientId, clientSecret } = discordConfig(c.env);
    if (!clientId || !clientSecret) {
      console.error("DISCORD_CLIENT_ID or DISCORD_CLIENT_SECRET is not configured");
      return c.redirect(loginRedirect("discord"));
    }

    const state = randomToken(24);
    setOAuthStateCookie(c, { state, next: safeRedirectPath(c.req.query("next")) });
    return c.redirect(buildAuthorizeUrl({ clientId, redirectUri: callbackUrl(c.req.url), state }));
  })

  .get("/callback", async (c) => {
    const stored = takeOAuthStateCookie(c);

    if (c.req.query("error")) {
      return c.redirect(loginRedirect("denied"));
    }

    const state = c.req.query("state");
    if (!stored || !state || stored.state !== state) {
      return c.redirect(loginRedirect("state"));
    }

    const code = c.req.query("code");
    if (!code) {
      return c.redirect(loginRedirect("callback"));
    }

    const { clientId, clientSecret } = discordConfig(c.env);
    let profile;
    try {
      const accessToken = await exchangeCode({
        clientId,
        clientSecret,
        code,
        redirectUri: callbackUrl(c.req.url),
      });
      c.executionCtx.waitUntil(
        revokeToken({ clientId, clientSecret, token: accessToken }).catch(() => undefined),
      );
      profile = await fetchDiscordProfile(accessToken);
    } catch (error) {
      console.error("Discord OAuth callback failed", error);
      return c.redirect(loginRedirect("callback"));
    }

    if (!isAllowedDiscordId(c.env, profile.id)) {
      return c.redirect(loginRedirect("not_allowed", { discord_id: profile.id }));
    }

    const user = await upsertDiscordUser(c.env.DB, profile);
    const session = await createSession(c.env.DB, user.id);
    setSessionCookie(c, session.token, session.expiresAt);
    return c.redirect(safeRedirectPath(stored.next));
  })

  .post("/logout", async (c) => {
    const token = getSessionToken(c);
    if (token) {
      await deleteSession(c.env.DB, token);
    }
    clearSessionCookie(c);
    return c.redirect("/login");
  });
