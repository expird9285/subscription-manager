import { createScheduledController } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createSubscription } from "../src/db/subscriptions";
import { runBillingAlerts } from "../src/discord/alerts";
import worker from "../src/index";
import { addDays, todayIn } from "../src/lib/dates";
import { ALLOWED_ID, BLOCKED_ID } from "./fixtures";
import { mockFetch, resetDb, seedRates, signedInteraction, signIn } from "./helpers";

beforeEach(async () => {
  await resetDb();
  await seedRates();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// 10:00 in Seoul (after the default ALERT_HOUR of 9).
const MORNING = new Date("2026-09-29T01:00:00Z");
// 07:00 in Seoul.
const EARLY = new Date("2026-09-28T22:00:00Z");
const TODAY = "2026-09-29";

function subscriptionInput(overrides: Partial<Parameters<typeof createSubscription>[2]> = {}) {
  return {
    name: "Netflix",
    category: "영상",
    price: 17000,
    split_count: 4,
    currency: "KRW",
    billing_cycle: "monthly" as const,
    next_billing_date: addDays(TODAY, 3),
    payment_method: null,
    payment_card_id: null as string | null,
    collection_account_id: null as string | null,
    status: "active" as const,
    auto_renew: true,
    memo: null,
    ...overrides,
  };
}

function commandInteraction(name: string, userId = ALLOWED_ID) {
  return {
    type: 2,
    token: "interaction-token",
    application_id: env.DISCORD_CLIENT_ID,
    data: { name },
    member: { user: { id: userId } },
  };
}

describe("Discord interactions endpoint", () => {
  it("answers Discord's signed PING", async () => {
    const response = await signedInteraction({ type: 1 });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ type: 1 });
  });

  it("rejects bad, missing or stale signatures", async () => {
    const missing = await fetchInteraction({ type: 1 }, {});
    expect(missing.status).toBe(401);

    const unsigned = await fetchInteraction({ type: 1 }, { "x-signature-ed25519": "00".repeat(64) });
    expect(unsigned.status).toBe(401);

    const stale = await signedInteraction({ type: 1 }, Math.floor(Date.now() / 1000) - 3600);
    expect(stale.status).toBe(401);
  });

  async function fetchInteraction(body: unknown, headers: Record<string, string>) {
    const { exports } = await import("cloudflare:workers");
    return exports.default.fetch(
      new Request("http://localhost/discord/interactions", {
        method: "POST",
        body: JSON.stringify(body),
        headers: {
          "content-type": "application/json",
          "x-signature-timestamp": String(Math.floor(Date.now() / 1000)),
          ...headers,
        },
      }),
    );
  }

  it("lists the caller's own subscriptions as an ephemeral embed", async () => {
    const { user } = await signIn(ALLOWED_ID);
    const today = todayIn("Asia/Seoul");
    await createSubscription(env.DB, user.id, subscriptionInput({ name: "Spotify*", next_billing_date: today }));

    const response = await signedInteraction(commandInteraction("구독목록"));
    const body = (await response.json()) as {
      type: number;
      data: { flags: number; embeds: { title: string; description: string }[] };
    };
    expect(body.type).toBe(4);
    expect(body.data.flags).toBe(64);
    expect(body.data.embeds[0]?.title).toBe("활성 구독 목록");
    expect(body.data.embeds[0]?.description).toContain("**Spotify\\***");
    expect(body.data.embeds[0]?.description).toContain("₩4,250 내 부담");
    expect(body.data.embeds[0]?.description).toContain("1/4");
  });

  it("shows this month's totals", async () => {
    const { user } = await signIn(ALLOWED_ID);
    const today = todayIn("Asia/Seoul");
    await createSubscription(env.DB, user.id, subscriptionInput({ next_billing_date: today, currency: "USD", price: 20, split_count: 2 }));

    const body = (await (await signedInteraction(commandInteraction("이번달"))).json()) as {
      data: { embeds: { fields: { name: string; value: string }[] }[] };
    };
    const fields = body.data.embeds[0]?.fields ?? [];
    expect(fields.find((field) => field.name === "내 부담 총액")?.value).toContain("10.00");
    expect(fields.find((field) => field.name === "원화 환산")?.value).toContain("₩14,000");
  });

  it("refuses callers outside the allowlist", async () => {
    const body = (await (await signedInteraction(commandInteraction("구독목록", BLOCKED_ID))).json()) as {
      data: { content: string };
    };
    expect(body.data.content).toContain("사용할 수 있는 Discord 계정이 아닙니다");
  });

  it("asks allowlisted users to sign in on the web first", async () => {
    const body = (await (await signedInteraction(commandInteraction("상태"))).json()) as {
      data: { content: string };
    };
    expect(body.data.content).toContain("http://localhost/login");
  });

  it("reports status", async () => {
    await signIn(ALLOWED_ID);
    const body = (await (await signedInteraction(commandInteraction("상태"))).json()) as {
      data: { embeds: { fields: { name: string; value: string }[] }[] };
    };
    expect(body.data.embeds[0]?.fields).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "D1", value: "정상" })]),
    );
  });
});

describe("billing alerts", () => {
  function mockDiscordChannel(status = 200) {
    return mockFetch((url) => {
      if (url.pathname === `/api/v10/channels/${env.DISCORD_ALERT_CHANNEL_ID}/messages`) {
        return new Response(status === 200 ? "{}" : "rate limited", { status });
      }
      return new Response("unexpected", { status: 500 });
    });
  }

  it("sends D-7/D-3/D-1/D-day alerts once each", async () => {
    const { user } = await signIn(ALLOWED_ID);
    for (const [name, offset] of [["D7", 7], ["D3", 3], ["D1", 1], ["DDAY", 0], ["D5", 5], ["PAST", -1]] as const) {
      await createSubscription(env.DB, user.id, subscriptionInput({ name, next_billing_date: addDays(TODAY, offset) }));
    }
    await createSubscription(env.DB, user.id, subscriptionInput({ name: "OFF", auto_renew: false }));
    await createSubscription(env.DB, user.id, subscriptionInput({ name: "PAUSED", status: "paused" }));

    const fetchSpy = mockDiscordChannel();
    expect(await runBillingAlerts(env, MORNING)).toEqual({ status: "done", sent: 4, failed: 0 });

    const contents = fetchSpy.mock.calls.map(([, init]) => JSON.parse(String(init?.body)).content as string);
    expect(contents).toEqual([
      "오늘 **DDAY** 구독이 결제돼요. 결제 계좌에 **17,000원** 이상 채워져 있는지 확인해 주세요.",
      "1일 뒤에 **D1** 구독이 결제돼요. 결제 계좌에 **17,000원** 이상 채워져 있는지 확인해 주세요.",
      "3일 뒤에 **D3** 구독이 결제돼요. 결제 계좌에 **17,000원** 이상 채워져 있는지 확인해 주세요.",
      "7일 뒤에 **D7** 구독이 결제돼요. 결제 계좌에 **17,000원** 이상 채워져 있는지 확인해 주세요.",
    ]);
    const firstCall = fetchSpy.mock.calls[0]!;
    expect(new Headers(firstCall[1]?.headers).get("authorization")).toBe(`Bot ${env.DISCORD_BOT_TOKEN}`);
    expect(JSON.parse(String(firstCall[1]?.body)).allowed_mentions).toEqual({ parse: [] });

    expect(await runBillingAlerts(env, new Date(MORNING.getTime() + 3_600_000))).toEqual({
      status: "done",
      sent: 0,
      failed: 0,
    });
  });

  it("waits until ALERT_HOUR in the configured timezone", async () => {
    const { user } = await signIn(ALLOWED_ID);
    await createSubscription(env.DB, user.id, subscriptionInput());
    const fetchSpy = mockDiscordChannel();
    expect(await runBillingAlerts(env, EARLY)).toEqual({ status: "skipped", reason: "before_alert_hour" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("retries on the next run when Discord rejects the message", async () => {
    const { user } = await signIn(ALLOWED_ID);
    await createSubscription(env.DB, user.id, subscriptionInput());

    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockDiscordChannel(429);
    expect(await runBillingAlerts(env, MORNING)).toEqual({ status: "done", sent: 0, failed: 1 });
    expect(await env.DB.prepare("SELECT COUNT(*) AS n FROM notification_logs").first("n")).toBe(0);

    vi.restoreAllMocks();
    mockDiscordChannel();
    expect(await runBillingAlerts(env, MORNING)).toEqual({ status: "done", sent: 1, failed: 0 });
  });

  it("runs from the cron trigger using the scheduled time", async () => {
    const { user } = await signIn(ALLOWED_ID);
    await createSubscription(env.DB, user.id, subscriptionInput());
    const fetchSpy = mockDiscordChannel();
    vi.spyOn(console, "log").mockImplementation(() => undefined);

    await worker.scheduled(
      createScheduledController({ scheduledTime: MORNING.getTime(), cron: "0 * * * *" }),
      env,
    );

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(await env.DB.prepare("SELECT value FROM app_state WHERE key = 'last_alert_at'").first("value")).toBe(
      JSON.stringify(MORNING.toISOString()),
    );
  });
});
