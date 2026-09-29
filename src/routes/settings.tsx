import { Hono } from "hono";

import { requireUser } from "../auth/session";
import { LAST_ALERT_KEY, sendTestAlert } from "../discord/alerts";
import { registerCommands } from "../discord/api";
import { getState } from "../db/state";
import { countSubscriptions, listSubscriptions } from "../db/subscriptions";
import { alertHourOf, allowedDiscordIds, discordConfig, timeZoneOf } from "../lib/config";
import { formatDateTime, todayIn } from "../lib/dates";
import { getExchangeRates } from "../lib/exchange-rates";
import type { AppEnv } from "../lib/types";
import { SettingsPage } from "../views/pages/settings";
import { renderApp } from "../views/render";

export const settingsRoutes = new Hono<AppEnv>()
  .get("/", requireUser, async (c) => {
    const user = c.get("user");
    const timeZone = timeZoneOf(c.env);
    const discord = discordConfig(c.env);
    const [subscriptionCount, lastAlert, rates] = await Promise.all([
      countSubscriptions(c.env.DB, user.id),
      getState<string>(c.env.DB, LAST_ALERT_KEY),
      getExchangeRates(c.env.DB, (promise) => c.executionCtx.waitUntil(promise)),
    ]);

    return renderApp(
      c,
      "설정",
      <SettingsPage
        notice={c.req.query("notice")}
        view={{
          user,
          allowedCount: allowedDiscordIds(c.env).length,
          discord: {
            clientId: Boolean(discord.clientId),
            clientSecret: Boolean(discord.clientSecret),
            publicKey: Boolean(discord.publicKey),
            botToken: Boolean(discord.botToken),
            alertChannelId: discord.alertChannelId,
            guildId: discord.guildId,
          },
          interactionsUrl: new URL("/discord/interactions", c.req.url).toString(),
          timeZone,
          alertHour: alertHourOf(c.env),
          lastAlertAt: formatDateTime(lastAlert?.value, timeZone),
          rates,
          subscriptionCount,
        }}
      />,
    );
  })

  .post("/discord/commands", requireUser, async (c) => {
    try {
      await registerCommands(c.env);
      return c.redirect("/settings?notice=commands_registered");
    } catch (error) {
      console.error("Slash command registration failed", error);
      return c.redirect("/settings?notice=commands_failed");
    }
  })

  .post("/discord/test-alert", requireUser, async (c) => {
    try {
      await sendTestAlert(c.env);
      return c.redirect("/settings?notice=test_sent");
    } catch (error) {
      console.error("Test alert failed", error);
      return c.redirect("/settings?notice=test_failed");
    }
  })

  .get("/export", requireUser, async (c) => {
    const user = c.get("user");
    const subscriptions = await listSubscriptions(c.env.DB, user.id);
    const today = todayIn(timeZoneOf(c.env));

    c.header("content-disposition", `attachment; filename="subscriptions_${today}.json"`);
    c.header("cache-control", "no-store");
    return c.json({
      exported_at: new Date().toISOString(),
      user: { discord_id: user.discord_id, username: user.username },
      subscriptions,
    });
  });
