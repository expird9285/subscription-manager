import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { csrf } from "hono/csrf";
import { secureHeaders } from "hono/secure-headers";

import { requireUser } from "./auth/session";
import { listPaymentMethods } from "./db/payment-methods";
import { deleteExpiredSessions } from "./db/sessions";
import { listSubscriptions } from "./db/subscriptions";
import { runBillingAlerts } from "./discord/alerts";
import { handleInteraction } from "./discord/interactions";
import { timeZoneOf } from "./lib/config";
import { addDays, todayIn } from "./lib/dates";
import { getExchangeRates, refreshExchangeRatesIfStale } from "./lib/exchange-rates";
import { summarizeOutflow } from "./lib/payments";
import type { AppEnv } from "./lib/types";
import { authRoutes, loginRoutes } from "./routes/auth";
import { OUTFLOW_WINDOW_DAYS, paymentRoutes } from "./routes/payments";
import { settingsRoutes } from "./routes/settings";
import { shareRoutes } from "./routes/share";
import { subscriptionRoutes } from "./routes/subscriptions";
import { AnalyticsPage } from "./views/pages/analytics";
import { DashboardPage } from "./views/pages/dashboard";
import { ErrorPage } from "./views/pages/error";
import { renderApp, renderDocument } from "./views/render";

const app = new Hono<AppEnv>();

// Discord calls this with a signed JSON body, so it is registered before the CSRF check.
app.post("/discord/interactions", (c) => handleInteraction(c));

app.use(
  "*",
  secureHeaders({
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      baseUri: ["'none'"],
      objectSrc: ["'none'"],
    },
  }),
);
app.use("*", csrf());

app.get("/", (c) => c.redirect("/dashboard"));
app.route("/login", loginRoutes);
app.route("/auth", authRoutes);
app.route("/subscriptions", subscriptionRoutes);
app.route("/payments", paymentRoutes);
app.route("/settings", settingsRoutes);
app.route("/s", shareRoutes);

app.get("/dashboard", requireUser, async (c) => {
  const userId = c.get("user").id;
  const today = todayIn(timeZoneOf(c.env));
  const [subscriptions, rates, { accounts, cards }] = await Promise.all([
    listSubscriptions(c.env.DB, userId),
    getExchangeRates(c.env.DB, (promise) => c.executionCtx.waitUntil(promise)),
    listPaymentMethods(c.env.DB, userId),
  ]);
  const outflow = summarizeOutflow({
    subscriptions,
    accounts,
    cards,
    from: today,
    to: addDays(today, OUTFLOW_WINDOW_DAYS),
  });
  return renderApp(
    c,
    "대시보드",
    <DashboardPage subscriptions={subscriptions} rates={rates} today={today} outflow={outflow} />,
  );
});

app.get("/analytics", requireUser, async (c) => {
  const [subscriptions, rates] = await Promise.all([
    listSubscriptions(c.env.DB, c.get("user").id),
    getExchangeRates(c.env.DB, (promise) => c.executionCtx.waitUntil(promise)),
  ]);
  return renderApp(
    c,
    "분석",
    <AnalyticsPage subscriptions={subscriptions} rates={rates} today={todayIn(timeZoneOf(c.env))} />,
  );
});

app.notFound((c) =>
  renderDocument(
    c,
    <ErrorPage title="페이지를 찾을 수 없습니다" message="주소가 바뀌었거나 없는 페이지입니다." />,
    404,
  ),
);

app.onError((error, c) => {
  if (error instanceof HTTPException) {
    return error.getResponse();
  }
  console.error("Unhandled error", error);
  return renderDocument(
    c,
    <ErrorPage title="오류가 발생했습니다" message="잠시 후 다시 시도해 주세요. 문제가 계속되면 Worker 로그를 확인해 주세요." />,
    500,
  );
});

async function runScheduledTasks(env: Env, now: Date) {
  const [alerts, rates, sessions] = await Promise.allSettled([
    runBillingAlerts(env, now),
    refreshExchangeRatesIfStale(env.DB),
    deleteExpiredSessions(env.DB),
  ]);

  if (alerts.status === "fulfilled") {
    console.log("Billing alerts", JSON.stringify(alerts.value));
  } else {
    console.error("Billing alerts failed", alerts.reason);
  }
  if (rates.status === "rejected") {
    console.error("Exchange-rate refresh failed", rates.reason);
  }
  if (sessions.status === "rejected") {
    console.error("Session cleanup failed", sessions.reason);
  }
}

export default {
  fetch: app.fetch,
  async scheduled(controller, env) {
    await runScheduledTasks(env, new Date(controller.scheduledTime));
  },
} satisfies ExportedHandler<Env>;

export { app };
