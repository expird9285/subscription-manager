import type { User } from "@supabase/supabase-js";

export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing Supabase public environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  return { url, key };
}

export function hasSupabaseConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
  );
}

export function isAllowedEmail(email?: string | null) {
  const allowlist = process.env.ALLOWED_EMAILS?.split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  if (!allowlist?.length) {
    return true;
  }

  return Boolean(email && allowlist.includes(email.toLowerCase()));
}

export function getDiscordUserId(user?: User | null) {
  if (!user) {
    return null;
  }

  const identity = user.identities?.find(
    (item) => item.provider === "discord",
  );
  const identityData = identity?.identity_data as
    | Record<string, unknown>
    | undefined;
  const metadata = user.user_metadata as Record<string, unknown> | undefined;
  const candidates = [
    identityData?.provider_id,
    identityData?.sub,
    identity?.id,
    metadata?.provider_id,
    metadata?.sub,
  ];

  const found = candidates.find(
    (candidate) => typeof candidate === "string" && candidate.length > 0,
  );

  return typeof found === "string" ? found : null;
}

export function isDiscordAuthUser(user?: User | null) {
  if (!user) {
    return false;
  }

  const provider = user.app_metadata?.provider;
  const providers = user.app_metadata?.providers;

  return (
    provider === "discord" ||
    (Array.isArray(providers) && providers.includes("discord")) ||
    user.identities?.some((identity) => identity.provider === "discord") === true
  );
}

export function isAllowedAuthUser(user?: User | null) {
  if (!user || !isDiscordAuthUser(user)) {
    return false;
  }

  const allowedDiscordIds = process.env.ALLOWED_DISCORD_IDS?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (allowedDiscordIds?.length) {
    const discordId = getDiscordUserId(user);
    return Boolean(discordId && allowedDiscordIds.includes(discordId));
  }

  return isAllowedEmail(user.email);
}
