import type { DiscordProfile } from "../db/users";

const DISCORD_API = "https://discord.com/api/v10";
const DISCORD_AUTHORIZE_URL = "https://discord.com/oauth2/authorize";
const TIMEOUT_MS = 8000;

export function callbackUrl(requestUrl: string) {
  return new URL("/auth/callback", requestUrl).toString();
}

export function buildAuthorizeUrl(options: { clientId: string; redirectUri: string; state: string }) {
  const url = new URL(DISCORD_AUTHORIZE_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", options.clientId);
  url.searchParams.set("scope", "identify");
  url.searchParams.set("redirect_uri", options.redirectUri);
  url.searchParams.set("state", options.state);
  url.searchParams.set("prompt", "none");
  return url.toString();
}

function basicAuth(clientId: string, clientSecret: string) {
  return `Basic ${btoa(`${clientId}:${clientSecret}`)}`;
}

export async function exchangeCode(options: {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
}) {
  const response = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: "POST",
    headers: {
      authorization: basicAuth(options.clientId, options.clientSecret),
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: options.code,
      redirect_uri: options.redirectUri,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Discord token exchange failed: ${response.status}`);
  }

  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error("Discord token response did not include an access token");
  }
  return data.access_token;
}

export async function fetchDiscordProfile(accessToken: string): Promise<DiscordProfile> {
  const response = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Discord profile request failed: ${response.status}`);
  }

  const profile = (await response.json()) as DiscordProfile;
  if (!profile.id || !profile.username) {
    throw new Error("Discord profile response is missing fields");
  }
  return profile;
}

/** The app only needs the profile once, so the access token is revoked right away. */
export async function revokeToken(options: { clientId: string; clientSecret: string; token: string }) {
  await fetch(`${DISCORD_API}/oauth2/token/revoke`, {
    method: "POST",
    headers: {
      authorization: basicAuth(options.clientId, options.clientSecret),
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ token: options.token, token_type_hint: "access_token" }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}
