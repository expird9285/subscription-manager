import { Hono, type Context } from "hono";

import { requireUser } from "../auth/session";
import {
  createBankAccount,
  createPaymentCard,
  deleteBankAccount,
  deletePaymentCard,
  getBankAccount,
  getPaymentCard,
  listBankAccounts,
  listPaymentMethods,
  updateBankAccount,
  updatePaymentCard,
} from "../db/payment-methods";
import { listSubscriptions } from "../db/subscriptions";
import { timeZoneOf } from "../lib/config";
import { addDays, todayIn } from "../lib/dates";
import { getExchangeRates } from "../lib/exchange-rates";
import { summarizeOutflow } from "../lib/payments";
import type { AppEnv } from "../lib/types";
import {
  formToValues,
  parseBankAccountForm,
  parsePaymentCardForm,
  type FormValues,
} from "../lib/validation";
import { ErrorPage } from "../views/pages/error";
import {
  AccountFormPage,
  accountToValues,
  CardFormPage,
  cardToValues,
} from "../views/pages/payment-forms";
import { PaymentsPage } from "../views/pages/payments";
import { renderApp, renderDocument } from "../views/render";

export const OUTFLOW_WINDOW_DAYS = 30;

function notFound(c: Context<AppEnv>) {
  return renderDocument(
    c,
    <ErrorPage title="결제수단을 찾을 수 없습니다" message="삭제되었거나 접근할 수 없는 계좌 또는 카드입니다." />,
    404,
  );
}

/** Checks that a selected account belongs to the user; returns an error message otherwise. */
async function accountError(c: Context<AppEnv>, accountId: string | null) {
  if (accountId && !(await getBankAccount(c.env.DB, c.get("user").id, accountId))) {
    return "선택한 계좌를 찾을 수 없습니다.";
  }
  return null;
}

async function renderCardForm(
  c: Context<AppEnv>,
  props: { title: string; action: string; values: FormValues; errors?: string[]; submitLabel: string },
  status: 200 | 400 = 200,
) {
  const accounts = await listBankAccounts(c.env.DB, c.get("user").id);
  return renderApp(c, props.title, <CardFormPage {...props} accounts={accounts} />, status);
}

export const paymentRoutes = new Hono<AppEnv>()
  .get("/", requireUser, async (c) => {
    const user = c.get("user");
    const today = todayIn(timeZoneOf(c.env));
    const until = addDays(today, OUTFLOW_WINDOW_DAYS);
    const [{ accounts, cards }, subscriptions, rates] = await Promise.all([
      listPaymentMethods(c.env.DB, user.id),
      listSubscriptions(c.env.DB, user.id),
      getExchangeRates(c.env.DB, (promise) => c.executionCtx.waitUntil(promise)),
    ]);
    const outflow = summarizeOutflow({ subscriptions, accounts, cards, from: today, to: until });

    return renderApp(
      c,
      "결제수단",
      <PaymentsPage
        groups={outflow.accountGroups}
        unassigned={outflow.unassigned}
        unassignedTotals={outflow.unassignedTotals}
        today={today}
        until={until}
        rates={rates}
        notice={c.req.query("notice")}
      />,
    );
  })

  .get("/accounts/new", requireUser, (c) =>
    renderApp(
      c,
      "계좌 추가",
      <AccountFormPage title="계좌 추가" action="/payments/accounts" values={{}} submitLabel="추가" />,
    ),
  )

  .post("/accounts", requireUser, async (c) => {
    const values = formToValues(await c.req.formData());
    const parsed = parseBankAccountForm(values);
    if (!parsed.ok) {
      return renderApp(
        c,
        "계좌 추가",
        <AccountFormPage title="계좌 추가" action="/payments/accounts" values={values} errors={parsed.errors} submitLabel="추가" />,
        400,
      );
    }
    await createBankAccount(c.env.DB, c.get("user").id, parsed.value);
    return c.redirect("/payments?notice=account_created");
  })

  .get("/accounts/:id/edit", requireUser, async (c) => {
    const account = await getBankAccount(c.env.DB, c.get("user").id, c.req.param("id"));
    if (!account) {
      return notFound(c);
    }
    return renderApp(
      c,
      "계좌 수정",
      <AccountFormPage
        title="계좌 수정"
        action={`/payments/accounts/${account.id}`}
        values={accountToValues(account)}
        submitLabel="저장"
      />,
    );
  })

  .post("/accounts/:id", requireUser, async (c) => {
    const id = c.req.param("id");
    const values = formToValues(await c.req.formData());
    const parsed = parseBankAccountForm(values);
    if (!parsed.ok) {
      return renderApp(
        c,
        "계좌 수정",
        <AccountFormPage title="계좌 수정" action={`/payments/accounts/${id}`} values={values} errors={parsed.errors} submitLabel="저장" />,
        400,
      );
    }
    if (!(await updateBankAccount(c.env.DB, c.get("user").id, id, parsed.value))) {
      return notFound(c);
    }
    return c.redirect("/payments?notice=account_updated");
  })

  .post("/accounts/:id/delete", requireUser, async (c) => {
    const deleted = await deleteBankAccount(c.env.DB, c.get("user").id, c.req.param("id"));
    return c.redirect(deleted ? "/payments?notice=account_deleted" : "/payments");
  })

  .get("/cards/new", requireUser, (c) =>
    renderCardForm(c, { title: "카드 추가", action: "/payments/cards", values: {}, submitLabel: "추가" }),
  )

  .post("/cards", requireUser, async (c) => {
    const values = formToValues(await c.req.formData());
    const parsed = parsePaymentCardForm(values);
    const ownership = parsed.ok ? await accountError(c, parsed.value.bank_account_id) : null;
    if (!parsed.ok || ownership) {
      const errors = parsed.ok ? [ownership!] : parsed.errors;
      return renderCardForm(c, { title: "카드 추가", action: "/payments/cards", values, errors, submitLabel: "추가" }, 400);
    }
    await createPaymentCard(c.env.DB, c.get("user").id, parsed.value);
    return c.redirect("/payments?notice=card_created");
  })

  .get("/cards/:id/edit", requireUser, async (c) => {
    const card = await getPaymentCard(c.env.DB, c.get("user").id, c.req.param("id"));
    if (!card) {
      return notFound(c);
    }
    return renderCardForm(c, {
      title: "카드 수정",
      action: `/payments/cards/${card.id}`,
      values: cardToValues(card),
      submitLabel: "저장",
    });
  })

  .post("/cards/:id", requireUser, async (c) => {
    const id = c.req.param("id");
    const values = formToValues(await c.req.formData());
    const parsed = parsePaymentCardForm(values);
    const ownership = parsed.ok ? await accountError(c, parsed.value.bank_account_id) : null;
    if (!parsed.ok || ownership) {
      const errors = parsed.ok ? [ownership!] : parsed.errors;
      return renderCardForm(c, { title: "카드 수정", action: `/payments/cards/${id}`, values, errors, submitLabel: "저장" }, 400);
    }
    if (!(await updatePaymentCard(c.env.DB, c.get("user").id, id, parsed.value))) {
      return notFound(c);
    }
    return c.redirect("/payments?notice=card_updated");
  })

  .post("/cards/:id/delete", requireUser, async (c) => {
    const deleted = await deletePaymentCard(c.env.DB, c.get("user").id, c.req.param("id"));
    return c.redirect(deleted ? "/payments?notice=card_deleted" : "/payments");
  });
