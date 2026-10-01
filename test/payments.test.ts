import { env } from "cloudflare:workers";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { addMonths, todayIn } from "../src/lib/dates";
import type { ExchangeRates } from "../src/lib/exchange-rates";
import { billingAlertMessage } from "../src/discord/format";
import type { AlertCandidate } from "../src/db/subscriptions";
import { collectionText, occurrencesWithin, summarizeOutflow } from "../src/lib/payments";
import type { BankAccount, PaymentCard, Subscription } from "../src/lib/types";
import { SECOND_ALLOWED_ID } from "./fixtures";
import { postForm, request, resetDb, seedRates, signIn, validSubscriptionForm } from "./helpers";

const rates: ExchangeRates = { date: "2026-09-28", krwPerUnit: { USD: 1400 }, source: "live", fetchedAt: null };

function subscription(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: crypto.randomUUID(),
    user_id: "user",
    name: "넷플릭스",
    category: null,
    price: 17000,
    split_count: 4,
    currency: "KRW",
    billing_cycle: "monthly",
    next_billing_date: "2026-10-03",
    payment_method: null,
    payment_card_id: null,
    collection_account_id: null,
    share_token: null,
    status: "active",
    auto_renew: true,
    memo: null,
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

const account: BankAccount = {
  id: "acc",
  user_id: "user",
  bank_name: "국민은행",
  nickname: "월급통장",
  account_number: "123-456-789",
  holder_name: "홍길동",
  memo: null,
  created_at: "",
  updated_at: "",
};

const card: PaymentCard = {
  id: "card",
  user_id: "user",
  name: "현대카드",
  last4: "1234",
  bank_account_id: "acc",
  memo: null,
  created_at: "",
  updated_at: "",
};

describe("billing occurrences", () => {
  it("rolls dates forward by cycle within the window", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2028-01-31", 1)).toBe("2028-02-29");
    expect(occurrencesWithin({ next_billing_date: "2026-10-01", billing_cycle: "weekly" }, "2026-10-01", "2026-10-31")).toEqual([
      "2026-10-01",
      "2026-10-08",
      "2026-10-15",
      "2026-10-22",
      "2026-10-29",
    ]);
    // A past monthly date anchored on the 31st keeps its day where the month allows it.
    expect(occurrencesWithin({ next_billing_date: "2026-01-31", billing_cycle: "monthly" }, "2026-02-01", "2026-03-31")).toEqual([
      "2026-02-28",
      "2026-03-31",
    ]);
    expect(occurrencesWithin({ next_billing_date: "2026-03-15", billing_cycle: "yearly" }, "2026-10-01", "2026-10-31")).toEqual([]);
    expect(occurrencesWithin({ next_billing_date: "2026-09-01", billing_cycle: "custom" }, "2026-10-01", "2026-10-31")).toEqual([]);
    expect(occurrencesWithin({ next_billing_date: "2026-10-05", billing_cycle: "custom" }, "2026-10-01", "2026-10-31")).toEqual([
      "2026-10-05",
    ]);
  });

  it("groups full charges by the account behind each card and tracks money to collect", () => {
    const orphanCard: PaymentCard = { ...card, id: "orphan", name: "체크카드", bank_account_id: null };
    const result = summarizeOutflow({
      subscriptions: [
        subscription({ payment_card_id: "card", collection_account_id: "acc" }),
        subscription({ name: "유튜브", price: 14900, split_count: 1, payment_card_id: "orphan" }),
        subscription({ name: "ChatGPT", price: 20, currency: "USD", split_count: 1 }),
        subscription({ name: "꺼짐", auto_renew: false, payment_card_id: "card" }),
      ],
      accounts: [account],
      cards: [card, orphanCard],
      from: "2026-10-01",
      to: "2026-10-31",
    });

    const [main, noAccount] = result.accountGroups;
    expect(main?.account?.id).toBe("acc");
    expect(main?.totals).toEqual({ KRW: 17000 });
    expect(main?.incomingTotals).toEqual({ KRW: 12750 });
    expect(noAccount?.account).toBeNull();
    expect(noAccount?.cards.map((item) => item.id)).toEqual(["orphan"]);
    expect(noAccount?.totals).toEqual({ KRW: 14900 });
    expect(result.unassignedTotals).toEqual({ USD: 20 });
  });
});

describe("messages", () => {
  function candidate(overrides: Partial<AlertCandidate> = {}): AlertCandidate {
    return {
      ...subscription({ next_billing_date: "2026-10-04" }),
      owner_discord_id: "1",
      card_name: "현대카드",
      account_bank_name: "국민은행",
      account_nickname: "월급통장",
      ...overrides,
    };
  }

  it("formats billing alerts with the card, its account and the full amount", () => {
    const today = "2026-10-01";
    expect(billingAlertMessage(candidate(), today, rates)).toBe(
      "3일 뒤에 **넷플릭스** 구독이 결제돼요. **현대카드**에 연결된 계좌(국민은행 월급통장)에 **17,000원** 이상 채워져 있는지 확인해 주세요.",
    );
    expect(billingAlertMessage(candidate({ account_bank_name: null, account_nickname: null }), today, rates)).toBe(
      "3일 뒤에 **넷플릭스** 구독이 결제돼요. **현대카드**에 연결된 계좌에 **17,000원** 이상 채워져 있는지 확인해 주세요.",
    );
    expect(
      billingAlertMessage(
        candidate({ card_name: null, account_bank_name: null, account_nickname: null, payment_method: "토스카드" }),
        today,
        rates,
      ),
    ).toBe("3일 뒤에 **넷플릭스** 구독이 결제돼요. **토스카드**에 연결된 계좌에 **17,000원** 이상 채워져 있는지 확인해 주세요.");
    expect(
      billingAlertMessage(
        candidate({ card_name: null, account_bank_name: null, next_billing_date: today, price: 20, currency: "USD" }),
        today,
        rates,
      ),
    ).toBe("오늘 **넷플릭스** 구독이 결제돼요. 결제 계좌에 **US$20.00(약 28,000원)** 이상 채워져 있는지 확인해 주세요.");
  });

  it("builds a copyable collection message", () => {
    expect(collectionText(subscription(), account)).toBe(
      [
        "[넷플릭스] 구독료 정산 안내",
        "1인당 4,250원 (전체 17,000원 ÷ 4명)",
        "결제일 2026-10-03 (월간)",
        "입금: 국민은행 123-456-789 (예금주 홍길동)",
      ].join("\n"),
    );
    expect(collectionText(subscription(), null)).toContain("입금 계좌: 아직 지정되지 않았어요");
  });
});

describe("payment method routes", () => {
  beforeEach(async () => {
    await resetDb();
    await seedRates();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function rowsOf<T>(sql: string, ...params: unknown[]) {
    const { results } = await env.DB.prepare(sql).bind(...params).all<T>();
    return results;
  }

  async function createAccountAndCard(cookie: string) {
    await postForm(
      "/payments/accounts",
      { bank_name: "국민은행", nickname: "월급통장", account_number: "123-456-789", holder_name: "홍길동" },
      { cookie },
    );
    const [acc] = await rowsOf<{ id: string }>("SELECT id FROM bank_accounts");
    await postForm("/payments/cards", { name: "현대카드", last4: "1234", bank_account_id: acc!.id }, { cookie });
    const [createdCard] = await rowsOf<{ id: string }>("SELECT id FROM payment_cards");
    return { accountId: acc!.id, cardId: createdCard!.id };
  }

  it("manages accounts and cards and totals the next 30 days per account", async () => {
    const { user, cookie } = await signIn();
    const { accountId, cardId } = await createAccountAndCard(cookie);

    const today = todayIn("Asia/Seoul");
    await postForm(
      "/subscriptions",
      validSubscriptionForm({
        next_billing_date: today,
        payment_card_id: cardId,
        collection_account_id: accountId,
      }),
      { cookie },
    );
    const [sub] = await rowsOf<{ payment_card_id: string; collection_account_id: string }>(
      "SELECT payment_card_id, collection_account_id FROM subscriptions WHERE user_id = ?",
      user.id,
    );
    expect(sub).toEqual({ payment_card_id: cardId, collection_account_id: accountId });

    const html = await (await request("/payments", { cookie })).text();
    expect(html).toContain("국민은행 월급통장");
    expect(html).toContain("현대카드 (1234)");
    expect(html).toContain("₩17,000");
    expect(html).toContain("₩12,750");

    const list = await (await request("/subscriptions", { cookie })).text();
    expect(list).toContain("현대카드 (1234)");
    expect(list).toContain(`/subscriptions/`);

    const deleted = await postForm(`/payments/accounts/${accountId}/delete`, {}, { cookie });
    expect(deleted.headers.get("location")).toBe("/payments?notice=account_deleted");
    expect(await rowsOf("SELECT bank_account_id FROM payment_cards")).toEqual([{ bank_account_id: null }]);
    expect(await rowsOf("SELECT collection_account_id FROM subscriptions")).toEqual([{ collection_account_id: null }]);
  });

  it("validates account and card input", async () => {
    const { cookie } = await signIn();
    const badAccount = await postForm("/payments/accounts", { bank_name: "", account_number: "12a" }, { cookie });
    expect(badAccount.status).toBe(400);
    expect(await badAccount.text()).toContain("은행 이름을 입력해 주세요.");

    const badCard = await postForm("/payments/cards", { name: "카드", last4: "12" }, { cookie });
    expect(badCard.status).toBe(400);
    expect(await badCard.text()).toContain("카드 끝 4자리는 숫자 4개여야 합니다.");
  });

  it("refuses another user's cards and accounts", async () => {
    const owner = await signIn();
    const { accountId, cardId } = await createAccountAndCard(owner.cookie);
    const other = await signIn(SECOND_ALLOWED_ID);

    const sub = await postForm("/subscriptions", validSubscriptionForm({ payment_card_id: cardId }), {
      cookie: other.cookie,
    });
    expect(sub.status).toBe(400);
    expect(await sub.text()).toContain("선택한 결제 카드를 찾을 수 없습니다.");

    const card2 = await postForm("/payments/cards", { name: "남의 계좌", bank_account_id: accountId }, {
      cookie: other.cookie,
    });
    expect(card2.status).toBe(400);
    expect((await request(`/payments/accounts/${accountId}/edit`, { cookie: other.cookie })).status).toBe(404);
    await postForm(`/payments/cards/${cardId}/delete`, {}, { cookie: other.cookie });
    expect(await rowsOf("SELECT id FROM payment_cards")).toHaveLength(1);
  });

  it("shares collection details through a revocable public link", async () => {
    const { user, cookie } = await signIn();
    const { accountId } = await createAccountAndCard(cookie);
    await postForm("/subscriptions", validSubscriptionForm({ collection_account_id: accountId }), { cookie });
    const [{ id }] = (await rowsOf<{ id: string }>("SELECT id FROM subscriptions WHERE user_id = ?", user.id)) as [
      { id: string },
    ];

    const sharePage = await (await request(`/subscriptions/${id}/share`, { cookie })).text();
    expect(sharePage).toContain("1인당 4,250원 (전체 17,000원 ÷ 4명)");
    expect(sharePage).toContain("입금: 국민은행 123-456-789 (예금주 홍길동)");

    const created = await postForm(`/subscriptions/${id}/share/link`, {}, { cookie });
    expect(created.headers.get("location")).toBe(`/subscriptions/${id}/share?notice=link_created`);
    const [{ share_token: token }] = (await rowsOf<{ share_token: string }>(
      "SELECT share_token FROM subscriptions WHERE id = ?",
      id,
    )) as [{ share_token: string }];
    expect(token).toMatch(/^[\w-]{32}$/);

    const publicPage = await request(`/s/${token}`);
    expect(publicPage.status).toBe(200);
    expect(publicPage.headers.get("cache-control")).toBe("no-store");
    expect(publicPage.headers.get("x-robots-tag")).toContain("noindex");
    const publicHtml = await publicPage.text();
    expect(publicHtml).toContain("4,250원");
    expect(publicHtml).toContain("123-456-789");
    expect(publicHtml).not.toContain("가족 요금제");
    expect(publicHtml).not.toContain("현대카드");

    const other = await signIn(SECOND_ALLOWED_ID);
    expect((await postForm(`/subscriptions/${id}/share/link/disable`, {}, { cookie: other.cookie })).status).toBe(404);
    expect((await request(`/s/${token}`)).status).toBe(200);

    await postForm(`/subscriptions/${id}/share/link/rotate`, {}, { cookie });
    expect((await request(`/s/${token}`)).status).toBe(404);

    await postForm(`/subscriptions/${id}/share/link/disable`, {}, { cookie });
    expect(await rowsOf("SELECT share_token FROM subscriptions WHERE id = ?", id)).toEqual([{ share_token: null }]);
    expect((await request("/s/not-a-real-token-value-123456")).status).toBe(404);
  });
});
