import { Hono, type Context } from "hono";

import { requireUser } from "../auth/session";
import {
  getBankAccount,
  getPaymentCard,
  listPaymentMethods,
} from "../db/payment-methods";
import { randomToken } from "../db/sessions";
import {
  createSubscription,
  deleteSubscription,
  getSubscription,
  listSubscriptions,
  setAutoRenew,
  setShareToken,
  updateSubscription,
  updateSubscriptionStatus,
} from "../db/subscriptions";
import { timeZoneOf } from "../lib/config";
import { todayIn } from "../lib/dates";
import { getExchangeRates } from "../lib/exchange-rates";
import { collectionText } from "../lib/payments";
import { categoriesOf, filterAndSortSubscriptions, parseFilters } from "../lib/subscriptions";
import type { AppEnv, SubscriptionInput } from "../lib/types";
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
import { SharePage } from "../views/pages/share";
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

/** Rejects cards or accounts that do not belong to the signed-in user. */
async function ownershipErrors(c: Context<AppEnv>, input: SubscriptionInput) {
  const userId = c.get("user").id;
  const errors: string[] = [];
  if (input.payment_card_id && !(await getPaymentCard(c.env.DB, userId, input.payment_card_id))) {
    errors.push("선택한 결제 카드를 찾을 수 없습니다.");
  }
  if (input.collection_account_id && !(await getBankAccount(c.env.DB, userId, input.collection_account_id))) {
    errors.push("선택한 수금 계좌를 찾을 수 없습니다.");
  }
  return errors;
}

function paymentOptions(c: Context<AppEnv>) {
  return listPaymentMethods(c.env.DB, c.get("user").id);
}

function shareUrl(c: Context<AppEnv>, token: string | null) {
  return token ? new URL(`/s/${token}`, c.req.url).toString() : null;
}

export const subscriptionRoutes = new Hono<AppEnv>()
  .get("/", requireUser, async (c) => {
    const user = c.get("user");
    const [subscriptions, rates, options] = await Promise.all([
      listSubscriptions(c.env.DB, user.id),
      getExchangeRates(c.env.DB, (promise) => c.executionCtx.waitUntil(promise)),
      paymentOptions(c),
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
        cards={options.cards}
      />,
    );
  })

  .get("/new", requireUser, async (c) =>
    renderApp(c, "구독 추가", <NewSubscriptionPage values={emptyFormValues} options={await paymentOptions(c)} />),
  )

  .post("/", requireUser, async (c) => {
    const values = formToValues(await c.req.formData());
    const parsed = parseSubscriptionForm(values);
    const errors = parsed.ok ? await ownershipErrors(c, parsed.value) : parsed.errors;

    if (!parsed.ok || errors.length) {
      return renderApp(
        c,
        "구독 추가",
        <NewSubscriptionPage values={values} errors={errors} options={await paymentOptions(c)} />,
        400,
      );
    }

    await createSubscription(c.env.DB, c.get("user").id, parsed.value);
    return c.redirect(withNotice("/subscriptions", "created"));
  })

  .get("/:id/edit", requireUser, async (c) => {
    const [subscription, options] = await Promise.all([
      getSubscription(c.env.DB, c.get("user").id, c.req.param("id")),
      paymentOptions(c),
    ]);
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
        options={options}
      />,
    );
  })

  .post("/:id", requireUser, async (c) => {
    const id = c.req.param("id");
    const user = c.get("user");
    const values = formToValues(await c.req.formData());
    const parsed = parseSubscriptionForm(values);
    const errors = parsed.ok ? await ownershipErrors(c, parsed.value) : parsed.errors;

    if (!parsed.ok || errors.length) {
      const existing = await getSubscription(c.env.DB, user.id, id);
      if (!existing) {
        return notFound(c);
      }
      return renderApp(
        c,
        "구독 수정",
        <EditSubscriptionPage
          id={id}
          name={existing.name}
          values={values}
          errors={errors}
          options={await paymentOptions(c)}
        />,
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
  })

  .get("/:id/share", requireUser, async (c) => {
    const userId = c.get("user").id;
    const subscription = await getSubscription(c.env.DB, userId, c.req.param("id"));
    if (!subscription) {
      return notFound(c);
    }
    const account = subscription.collection_account_id
      ? await getBankAccount(c.env.DB, userId, subscription.collection_account_id)
      : null;

    return renderApp(
      c,
      "수금 안내",
      <SharePage
        subscription={subscription}
        account={account}
        text={collectionText(subscription, account)}
        shareUrl={shareUrl(c, subscription.share_token)}
        notice={c.req.query("notice")}
      />,
    );
  })

  .post("/:id/share/link", requireUser, async (c) => {
    const id = c.req.param("id");
    const subscription = await getSubscription(c.env.DB, c.get("user").id, id);
    if (!subscription) {
      return notFound(c);
    }
    if (!subscription.share_token) {
      await setShareToken(c.env.DB, c.get("user").id, id, randomToken(24));
    }
    return c.redirect(`/subscriptions/${id}/share?notice=link_created`);
  })

  .post("/:id/share/link/rotate", requireUser, async (c) => {
    const id = c.req.param("id");
    if (!(await setShareToken(c.env.DB, c.get("user").id, id, randomToken(24)))) {
      return notFound(c);
    }
    return c.redirect(`/subscriptions/${id}/share?notice=link_rotated`);
  })

  .post("/:id/share/link/disable", requireUser, async (c) => {
    const id = c.req.param("id");
    if (!(await setShareToken(c.env.DB, c.get("user").id, id, null))) {
      return notFound(c);
    }
    return c.redirect(`/subscriptions/${id}/share?notice=link_disabled`);
  });
