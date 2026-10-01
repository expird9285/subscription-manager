import { env } from "cloudflare:workers";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BLOCKED_ID, SECOND_ALLOWED_ID } from "./fixtures";
import {
  mockFetch,
  postForm,
  request,
  resetDb,
  seedRates,
  signIn,
  validSubscriptionForm,
} from "./helpers";

beforeEach(async () => {
  await resetDb();
  await seedRates();
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function subscriptionRows(userId: string) {
  const { results } = await env.DB.prepare("SELECT * FROM subscriptions WHERE user_id = ?")
    .bind(userId)
    .all<{ id: string; name: string; status: string; auto_renew: number; split_count: number }>();
  return results;
}

describe("authentication", () => {
  it("redirects anonymous visitors to the login page", async () => {
    const response = await request("/dashboard?tab=1");
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/login?next=%2Fdashboard%3Ftab%3D1");
  });

  it("renders the login page with security headers", async () => {
    const response = await request("/login?error=not_allowed&discord_id=123456789012");
    const html = await response.text();
    expect(response.status).toBe(200);
    expect(html).toContain("Discord로 계속하기");
    expect(html).toContain("123456789012");
    expect(response.headers.get("content-security-policy")).toContain("default-src 'self'");
    expect(response.headers.get("x-frame-options")).toBe("SAMEORIGIN");
  });

  it("starts Discord OAuth with a state cookie", async () => {
    const response = await request("/auth/discord?next=/analytics");
    expect(response.status).toBe(302);
    const location = new URL(response.headers.get("location") ?? "");
    expect(location.origin + location.pathname).toBe("https://discord.com/oauth2/authorize");
    expect(location.searchParams.get("client_id")).toBe(env.DISCORD_CLIENT_ID);
    expect(location.searchParams.get("scope")).toBe("identify");
    expect(location.searchParams.get("redirect_uri")).toBe("http://localhost/auth/callback");
    expect(response.headers.get("set-cookie")).toContain("sm_oauth=");
  });

  async function startLogin(next = "/analytics") {
    const response = await request(`/auth/discord?next=${encodeURIComponent(next)}`);
    const state = new URL(response.headers.get("location") ?? "").searchParams.get("state") ?? "";
    const cookie = (response.headers.get("set-cookie") ?? "").split(";")[0] ?? "";
    return { state, cookie };
  }

  function mockDiscordOAuth(discordId: string) {
    return mockFetch((url) => {
      if (url.pathname === "/api/v10/oauth2/token") {
        return Response.json({ access_token: "access-token", token_type: "Bearer" });
      }
      if (url.pathname === "/api/v10/users/@me") {
        return Response.json({ id: discordId, username: "ocsar", global_name: "오스카", avatar: null });
      }
      if (url.pathname === "/api/v10/oauth2/token/revoke") {
        return new Response(null, { status: 200 });
      }
      return new Response("unexpected", { status: 500 });
    });
  }

  it("completes the OAuth callback and creates a session for allowlisted users", async () => {
    const { state, cookie } = await startLogin("/analytics");
    const fetchSpy = mockDiscordOAuth(env.ALLOWED_DISCORD_IDS.split(",")[0]!.trim());

    const response = await request(`/auth/callback?code=abc&state=${state}`, { cookie });
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/analytics");
    const setCookie = response.headers.getSetCookie().join("\n");
    expect(setCookie).toMatch(/sm_session=[\w-]+/);
    expect(setCookie).toContain("HttpOnly");

    const tokenCall = fetchSpy.mock.calls.find(([input]) => String(input).endsWith("/oauth2/token"));
    expect(String(tokenCall?.[1]?.body)).toContain("redirect_uri=http%3A%2F%2Flocalhost%2Fauth%2Fcallback");

    const user = await env.DB.prepare("SELECT * FROM users").first<{ username: string; display_name: string }>();
    expect(user).toMatchObject({ username: "ocsar", display_name: "오스카" });

    const sessionCookie = setCookie.match(/sm_session=[\w-]+/)?.[0] ?? "";
    const dashboard = await request("/dashboard", { cookie: sessionCookie });
    expect(dashboard.status).toBe(200);
    expect(await dashboard.text()).toContain("오스카");
  });

  it("rejects Discord accounts that are not allowlisted", async () => {
    const { state, cookie } = await startLogin();
    mockDiscordOAuth(BLOCKED_ID);

    const response = await request(`/auth/callback?code=abc&state=${state}`, { cookie });
    expect(response.headers.get("location")).toBe(`/login?error=not_allowed&discord_id=${BLOCKED_ID}`);
    expect(response.headers.getSetCookie().join("\n")).not.toMatch(/sm_session=[\w-]+/);
    expect(await env.DB.prepare("SELECT COUNT(*) AS n FROM users").first("n")).toBe(0);
  });

  it("rejects callbacks whose state does not match", async () => {
    const { cookie } = await startLogin();
    const fetchSpy = mockDiscordOAuth(BLOCKED_ID);
    const response = await request("/auth/callback?code=abc&state=forged", { cookie });
    expect(response.headers.get("location")).toBe("/login?error=state");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("logs out by deleting the session", async () => {
    const { cookie } = await signIn();
    const response = await postForm("/auth/logout", {}, { cookie });
    expect(response.headers.get("location")).toBe("/login");
    expect(await env.DB.prepare("SELECT COUNT(*) AS n FROM sessions").first("n")).toBe(0);
    expect((await request("/dashboard", { cookie })).status).toBe(302);
  });

  it("drops access as soon as a user is removed from the allowlist", async () => {
    const { cookie } = await signIn(BLOCKED_ID);
    const response = await request("/dashboard", { cookie });
    expect(response.headers.get("location")).toContain("error=not_allowed");
  });
});

describe("subscriptions", () => {
  it("creates, lists, edits, updates and deletes a subscription", async () => {
    const { user, cookie } = await signIn();

    const created = await postForm("/subscriptions", validSubscriptionForm(), { cookie });
    expect(created.status).toBe(302);
    expect(created.headers.get("location")).toBe("/subscriptions?notice=created");

    const [row] = await subscriptionRows(user.id);
    expect(row).toMatchObject({ name: "Netflix", split_count: 4, auto_renew: 1, status: "active" });
    const id = row!.id;

    const list = await request("/subscriptions?notice=created", { cookie });
    const listHtml = await list.text();
    expect(listHtml).toContain("Netflix");
    expect(listHtml).toContain("구독을 추가했습니다.");
    expect(listHtml).toContain("1/4 부담");

    const edit = await request(`/subscriptions/${id}/edit`, { cookie });
    expect(await edit.text()).toContain('value="Netflix"');

    const updated = await postForm(`/subscriptions/${id}`, validSubscriptionForm({ name: "Netflix Premium" }), {
      cookie,
    });
    expect(updated.headers.get("location")).toBe("/subscriptions?notice=updated");

    await postForm(`/subscriptions/${id}/status`, { status: "cancel_pending", return_to: "/subscriptions?q=net" }, {
      cookie,
    }).then((response) => expect(response.headers.get("location")).toBe("/subscriptions?q=net"));
    await postForm(`/subscriptions/${id}/auto-renew`, { auto_renew: "false" }, { cookie });
    expect((await subscriptionRows(user.id))[0]).toMatchObject({
      name: "Netflix Premium",
      status: "cancel_pending",
      auto_renew: 0,
    });

    const deleted = await postForm(`/subscriptions/${id}/delete`, { return_to: "/subscriptions" }, { cookie });
    expect(deleted.headers.get("location")).toBe("/subscriptions?notice=deleted");
    expect(await subscriptionRows(user.id)).toHaveLength(0);
  });

  it("re-renders the form with errors for invalid input", async () => {
    const { user, cookie } = await signIn();
    const response = await postForm("/subscriptions", validSubscriptionForm({ price: "-5", name: "Keep me" }), {
      cookie,
    });
    expect(response.status).toBe(400);
    const html = await response.text();
    expect(html).toContain("전체 결제금액은 0 이상의 숫자여야 합니다.");
    expect(html).toContain('value="Keep me"');
    expect(await subscriptionRows(user.id)).toHaveLength(0);
  });

  it("rejects cross-site form posts", async () => {
    const { user, cookie } = await signIn();
    const missingOrigin = await postForm("/subscriptions", validSubscriptionForm(), { cookie, origin: null });
    const foreignOrigin = await postForm("/subscriptions", validSubscriptionForm(), {
      cookie,
      origin: "https://evil.example",
    });
    expect(missingOrigin.status).toBe(403);
    expect(foreignOrigin.status).toBe(403);
    expect(await subscriptionRows(user.id)).toHaveLength(0);
  });

  it("keeps each user's subscriptions private", async () => {
    const owner = await signIn();
    await postForm("/subscriptions", validSubscriptionForm({ name: "Owner only" }), { cookie: owner.cookie });
    const [row] = await subscriptionRows(owner.user.id);

    const other = await signIn(SECOND_ALLOWED_ID);
    expect(await (await request("/subscriptions", { cookie: other.cookie })).text()).not.toContain("Owner only");
    expect((await request(`/subscriptions/${row!.id}/edit`, { cookie: other.cookie })).status).toBe(404);
    await postForm(`/subscriptions/${row!.id}/delete`, {}, { cookie: other.cookie });
    expect(await subscriptionRows(owner.user.id)).toHaveLength(1);
  });

  it("renders dashboard, analytics and settings with foreign-currency estimates", async () => {
    const { cookie } = await signIn();
    await postForm(
      "/subscriptions",
      validSubscriptionForm({ name: "GitHub Copilot", price: "10", currency: "USD", split_count: "1" }),
      { cookie },
    );

    const dashboard = await (await request("/dashboard", { cookie })).text();
    expect(dashboard).toContain("GitHub Copilot");
    expect(dashboard).toContain("예상 ₩14,000");

    const analytics = await request("/analytics", { cookie });
    expect(analytics.status).toBe(200);
    expect(await analytics.text()).toContain("월 부담 TOP 5");

    const settings = await (await request("/settings", { cookie })).text();
    expect(settings).toContain("http://localhost/discord/interactions");
    expect(settings).toContain("2명 허용");
  });

  it("exports the user's subscriptions as JSON", async () => {
    const { cookie } = await signIn();
    await postForm("/subscriptions", validSubscriptionForm(), { cookie });
    const response = await request("/settings/export", { cookie });
    expect(response.headers.get("content-disposition")).toMatch(/attachment; filename="subscriptions_\d{4}-\d{2}-\d{2}\.json"/);
    const body = (await response.json()) as { subscriptions: { name: string; auto_renew: boolean }[] };
    expect(body.subscriptions).toEqual([expect.objectContaining({ name: "Netflix", auto_renew: true })]);
  });

  it("returns a 404 page for unknown routes", async () => {
    const response = await request("/nope");
    expect(response.status).toBe(404);
    expect(await response.text()).toContain("페이지를 찾을 수 없습니다");
  });
});
