import { Hono } from "hono";

import { getBankAccount } from "../db/payment-methods";
import { getSubscriptionByShareToken } from "../db/subscriptions";
import type { AppEnv } from "../lib/types";
import { ErrorPage } from "../views/pages/error";
import { PublicSharePage } from "../views/pages/share";
import { renderDocument } from "../views/render";

const TOKEN_RE = /^[A-Za-z0-9_-]{16,64}$/;

/** Public, read-only collection page for split-plan members. No login required. */
export const shareRoutes = new Hono<AppEnv>().get("/:token", async (c) => {
  c.header("cache-control", "no-store");
  c.header("x-robots-tag", "noindex, nofollow");

  const token = c.req.param("token");
  const subscription = TOKEN_RE.test(token) ? await getSubscriptionByShareToken(c.env.DB, token) : null;

  if (!subscription) {
    return renderDocument(
      c,
      <ErrorPage title="링크를 찾을 수 없습니다" message="공유가 꺼졌거나 새 링크로 바뀌었습니다. 링크를 보낸 사람에게 다시 요청해 주세요." />,
      404,
    );
  }

  const account = subscription.collection_account_id
    ? await getBankAccount(c.env.DB, subscription.user_id, subscription.collection_account_id)
    : null;

  return renderDocument(c, <PublicSharePage subscription={subscription} account={account} />);
});
