import { isValidTimeZone } from "./dates";

const DEFAULT_TIMEZONE = "Asia/Seoul";
const DEFAULT_ALERT_HOUR = 9;

function text(value: string | undefined | null) {
  return (value ?? "").trim();
}

export function timeZoneOf(env: Env) {
  const timeZone = text(env.TIMEZONE);
  return timeZone && isValidTimeZone(timeZone) ? timeZone : DEFAULT_TIMEZONE;
}

export function alertHourOf(env: Env) {
  const hour = Number.parseInt(text(env.ALERT_HOUR), 10);
  return Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : DEFAULT_ALERT_HOUR;
}

export function allowedDiscordIds(env: Env) {
  return text(env.ALLOWED_DISCORD_IDS)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

/** Fails closed: nobody is allowed until ALLOWED_DISCORD_IDS lists at least one ID. */
export function isAllowedDiscordId(env: Env, discordId: string | null | undefined) {
  return Boolean(discordId && allowedDiscordIds(env).includes(discordId));
}

export function discordConfig(env: Env) {
  return {
    clientId: text(env.DISCORD_CLIENT_ID),
    clientSecret: text(env.DISCORD_CLIENT_SECRET),
    publicKey: text(env.DISCORD_PUBLIC_KEY),
    botToken: text(env.DISCORD_BOT_TOKEN),
    alertChannelId: text(env.DISCORD_ALERT_CHANNEL_ID),
    guildId: text(env.DISCORD_GUILD_ID),
  };
}
