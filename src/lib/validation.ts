import { isIsoDate } from "./dates";
import {
  billingCycles,
  subscriptionStatuses,
  type BillingCycle,
  type SubscriptionInput,
  type SubscriptionStatus,
} from "./types";

export type FormValues = Record<string, string>;

export type ParseResult =
  | { ok: true; value: SubscriptionInput }
  | { ok: false; errors: string[]; values: FormValues };

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
      status,
      auto_renew: values.auto_renew === "on" || values.auto_renew === "true",
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
