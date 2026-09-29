import { Hono, type Context } from "hono";

import { requireUser } from "../auth/session";
import {
  createSubscription,
  deleteSubscription,
  getSubscription,
  listSubscriptions,
  setAutoRenew,
  updateSubscription,
  updateSubscriptionStatus,
} from "../db/subscriptions";
import { timeZoneOf } from "../lib/config";
import { todayIn } from "../lib/dates";
import { getExchangeRates } from "../lib/exchange-rates";
import { categoriesOf, filterAndSortSubscriptions, parseFilters } from "../lib/subscriptions";
import type { AppEnv } from "../lib/types";
import {
  formToValues,
  isSubscriptionStatus,
  parseSubscriptionForm,
  safeRedirectPath,
} from "../lib/validation";
import { ErrorPage } from "../views/pages/error";
import {
  EditSubscriptionPage,
  emptyFormValues,
  NewSubscriptionPage,
  subscriptionToValues,
} from "../views/pages/subscription-form";
import { SubscriptionsPage } from "../views/pages/subscriptions";
import { renderApp, renderDocument } from "../views/render";

function withNotice(path: string, notice: string) {
  const url = new URL(path, "http://local");
  url.searchParams.set("notice", notice);
  return `${url.pathname}${url.search}`;
}

function returnTo(form: FormData) {
  return safeRedirectPath(String(form.get("return_to") ?? ""), "/subscriptions");
}

function notFound(c: Context<AppEnv>) {
  return renderDocument(
    c,
    <ErrorPage title="구독을 찾을 수 없습니다" message="삭제되었거나 접근할 수 없는 구독입니다." />,
    404,
  );
}

export const subscriptionRoutes = new Hono<AppEnv>()
  .get("/", requireUser, async (c) => {
    const user = c.get("user");
    const [subscriptions, rates] = await Promise.all([
      listSubscriptions(c.env.DB, user.id),
      getExchangeRates(c.env.DB, (promise) => c.executionCtx.waitUntil(promise)),
    ]);
    const filters = parseFilters(c.req.query());
    const url = new URL(c.req.url);
    url.searchParams.delete("notice");

    return renderApp(
      c,
      "구독 목록",
      <SubscriptionsPage
        subscriptions={filterAndSortSubscriptions(subscriptions, filters)}
        categories={categoriesOf(subscriptions)}
        filters={filters}
        rates={rates}
        today={todayIn(timeZoneOf(c.env))}
        returnTo={`${url.pathname}${url.search}`}
        notice={c.req.query("notice")}
      />,
    );
  })

  .get("/new", requireUser, (c) =>
    renderApp(c, "구독 추가", <NewSubscriptionPage values={emptyFormValues} />),
  )

  .post("/", requireUser, async (c) => {
    const values = formToValues(await c.req.formData());
    const parsed = parseSubscriptionForm(values);

    if (!parsed.ok) {
      return renderApp(c, "구독 추가", <NewSubscriptionPage values={values} errors={parsed.errors} />, 400);
    }

    await createSubscription(c.env.DB, c.get("user").id, parsed.value);
    return c.redirect(withNotice("/subscriptions", "created"));
  })

  .get("/:id/edit", requireUser, async (c) => {
    const subscription = await getSubscription(c.env.DB, c.get("user").id, c.req.param("id"));
    if (!subscription) {
      return notFound(c);
    }
    return renderApp(
      c,
      "구독 수정",
      <EditSubscriptionPage
        id={subscription.id}
        name={subscription.name}
        values={subscriptionToValues(subscription)}
      />,
    );
  })

  .post("/:id", requireUser, async (c) => {
    const id = c.req.param("id");
    const user = c.get("user");
    const values = formToValues(await c.req.formData());
    const parsed = parseSubscriptionForm(values);

    if (!parsed.ok) {
      const existing = await getSubscription(c.env.DB, user.id, id);
      if (!existing) {
        return notFound(c);
      }
      return renderApp(
        c,
        "구독 수정",
        <EditSubscriptionPage id={id} name={existing.name} values={values} errors={parsed.errors} />,
        400,
      );
    }

    if (!(await updateSubscription(c.env.DB, user.id, id, parsed.value))) {
      return notFound(c);
    }
    return c.redirect(withNotice("/subscriptions", "updated"));
  })

  .post("/:id/status", requireUser, async (c) => {
    const form = await c.req.formData();
    const status = String(form.get("status") ?? "");
    if (isSubscriptionStatus(status)) {
      await updateSubscriptionStatus(c.env.DB, c.get("user").id, c.req.param("id"), status);
    }
    return c.redirect(returnTo(form));
  })

  .post("/:id/auto-renew", requireUser, async (c) => {
    const form = await c.req.formData();
    await setAutoRenew(c.env.DB, c.get("user").id, c.req.param("id"), form.get("auto_renew") === "true");
    return c.redirect(returnTo(form));
  })

  .post("/:id/delete", requireUser, async (c) => {
    const form = await c.req.formData();
    const deleted = await deleteSubscription(c.env.DB, c.get("user").id, c.req.param("id"));
    const target = returnTo(form);
    return c.redirect(deleted ? withNotice(target, "deleted") : target);
  });
