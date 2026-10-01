import { isIsoDate } from "./dates";
import {
  billingCycles,
  subscriptionStatuses,
  type BankAccountInput,
  type BillingCycle,
  type PaymentCardInput,
  type SubscriptionInput,
  type SubscriptionStatus,
} from "./types";

export type FormValues = Record<string, string>;

export type FormResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: string[]; values: FormValues };

export type ParseResult = FormResult<SubscriptionInput>;

const MAX_TEXT = 200;
const MAX_MEMO = 2000;

export function formToValues(form: FormData): FormValues {
  const values: FormValues = {};
  for (const [key, value] of form.entries()) {
    if (typeof value === "string") {
      values[key] = value;
    }
  }
  return values;
}

function clean(value: string | undefined, max = MAX_TEXT) {
  const text = (value ?? "").trim().slice(0, max);
  return text.length ? text : null;
}

export function isBillingCycle(value: string): value is BillingCycle {
  return (billingCycles as readonly string[]).includes(value);
}

export function isSubscriptionStatus(value: string): value is SubscriptionStatus {
  return (subscriptionStatuses as readonly string[]).includes(value);
}

export function parseSubscriptionForm(values: FormValues): ParseResult {
  const errors: string[] = [];

  const name = clean(values.name);
  if (!name) {
    errors.push("서비스 이름을 입력해 주세요.");
  }

  const price = Number(values.price);
  if (values.price?.trim() === "" || !Number.isFinite(price) || price < 0) {
    errors.push("전체 결제금액은 0 이상의 숫자여야 합니다.");
  }

  const splitCount = Number(values.split_count || 1);
  if (!Number.isInteger(splitCount) || splitCount < 1 || splitCount > 99) {
    errors.push("나누는 인원 수는 1~99 사이의 정수여야 합니다.");
  }

  const currency = (clean(values.currency) ?? "KRW").toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    errors.push("통화는 KRW, USD 같은 3자리 영문 코드여야 합니다.");
  }

  const billingCycle = values.billing_cycle ?? "";
  if (!isBillingCycle(billingCycle)) {
    errors.push("결제 주기를 선택해 주세요.");
  }

  const status = values.status || "active";
  if (!isSubscriptionStatus(status)) {
    errors.push("상태 값이 올바르지 않습니다.");
  }

  const nextBillingDate = (values.next_billing_date ?? "").trim();
  if (!isIsoDate(nextBillingDate)) {
    errors.push("다음 결제일을 YYYY-MM-DD 형식으로 입력해 주세요.");
  }

  if (errors.length || !name || !isBillingCycle(billingCycle) || !isSubscriptionStatus(status)) {
    return { ok: false, errors, values };
  }

  return {
    ok: true,
    value: {
      name,
      category: clean(values.category),
      price: Math.round(price * 100) / 100,
      split_count: splitCount,
      currency,
      billing_cycle: billingCycle,
      next_billing_date: nextBillingDate,
      payment_method: clean(values.payment_method),
      payment_card_id: clean(values.payment_card_id),
      collection_account_id: clean(values.collection_account_id),
      status,
      auto_renew: values.auto_renew === "on" || values.auto_renew === "true",
      memo: clean(values.memo, MAX_MEMO),
    },
  };
}

export function parseBankAccountForm(values: FormValues): FormResult<BankAccountInput> {
  const errors: string[] = [];

  const bankName = clean(values.bank_name);
  if (!bankName) {
    errors.push("은행 이름을 입력해 주세요.");
  }

  const accountNumber = clean(values.account_number, 40);
  if (accountNumber && !/^[0-9][0-9 -]*[0-9]$/.test(accountNumber)) {
    errors.push("계좌번호는 숫자, 공백, 하이픈(-)만 쓸 수 있습니다.");
  }

  if (errors.length || !bankName) {
    return { ok: false, errors, values };
  }

  return {
    ok: true,
    value: {
      bank_name: bankName,
      nickname: clean(values.nickname),
      account_number: accountNumber,
      holder_name: clean(values.holder_name),
      memo: clean(values.memo, MAX_MEMO),
    },
  };
}

export function parsePaymentCardForm(values: FormValues): FormResult<PaymentCardInput> {
  const errors: string[] = [];

  const name = clean(values.name);
  if (!name) {
    errors.push("카드 이름을 입력해 주세요.");
  }

  const last4 = clean(values.last4);
  if (last4 && !/^\d{4}$/.test(last4)) {
    errors.push("카드 끝 4자리는 숫자 4개여야 합니다.");
  }

  if (errors.length || !name) {
    return { ok: false, errors, values };
  }

  return {
    ok: true,
    value: {
      name,
      last4,
      bank_account_id: clean(values.bank_account_id),
      memo: clean(values.memo, MAX_MEMO),
    },
  };
}

/** Only allow same-site relative paths as redirect targets. */
export function safeRedirectPath(value: string | null | undefined, fallback = "/dashboard") {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback;
  }
  return value;
}
