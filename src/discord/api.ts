import { discordConfig } from "../lib/config";
import { commandDefinitions } from "./commands";

const DISCORD_API = "https://discord.com/api/v10";
const TIMEOUT_MS = 10_000;

export type DiscordEmbed = {
  title?: string;
  description?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string };
};

export type MessagePayload = {
  content?: string;
  embeds?: DiscordEmbed[];
  flags?: number;
  allowed_mentions?: { parse: string[] };
};

export class DiscordApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: string,
  ) {
    super(`Discord API request failed with ${status}: ${body.slice(0, 300)}`);
  }
}

async function discordRequest(path: string, init: RequestInit & { botToken?: string }) {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");
  if (init.botToken) {
    headers.set("authorization", `Bot ${init.botToken}`);
  }

  const response = await fetch(`${DISCORD_API}${path}`, {
    ...init,
    headers,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new DiscordApiError(response.status, await response.text());
  }
  return response;
}

function requireValue(value: string, name: string) {
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

/** Posts to the configured alert channel. Mentions are disabled so names can't ping anyone. */
export async function sendAlertMessage(env: Env, payload: MessagePayload) {
  const config = discordConfig(env);
  const channelId = requireValue(config.alertChannelId, "DISCORD_ALERT_CHANNEL_ID");
  await discordRequest(`/channels/${channelId}/messages`, {
    method: "POST",
    botToken: requireValue(config.botToken, "DISCORD_BOT_TOKEN"),
    body: JSON.stringify({ allowed_mentions: { parse: [] }, ...payload }),
  });
}

/** Replaces the whole slash-command set (guild-scoped when DISCORD_GUILD_ID is set). */
export async function registerCommands(env: Env) {
  const config = discordConfig(env);
  const applicationId = requireValue(config.clientId, "DISCORD_CLIENT_ID");
  const path = config.guildId
    ? `/applications/${applicationId}/guilds/${config.guildId}/commands`
    : `/applications/${applicationId}/commands`;

  await discordRequest(path, {
    method: "PUT",
    botToken: requireValue(config.botToken, "DISCORD_BOT_TOKEN"),
    body: JSON.stringify(commandDefinitions),
  });
}

/** Edits the deferred response of an interaction (interaction tokens need no bot auth). */
export async function editOriginalResponse(applicationId: string, token: string, payload: MessagePayload) {
  await discordRequest(`/webhooks/${applicationId}/${token}/messages/@original`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
