import { accountLabel, cardLabel } from "../../lib/payments";
import { billingCycleLabels, statusLabels } from "../../lib/subscriptions";
import type { BankAccount, PaymentCard, Subscription } from "../../lib/types";
import type { FormValues } from "../../lib/validation";
import { Button, Field, inputClass, LinkButton, Notice, PageHeader, textareaClass } from "../ui";

export function subscriptionToValues(subscription: Subscription): FormValues {
  return {
    name: subscription.name,
    category: subscription.category ?? "",
    price: String(subscription.price),
    split_count: String(subscription.split_count),
    currency: subscription.currency,
    billing_cycle: subscription.billing_cycle,
    next_billing_date: subscription.next_billing_date,
    payment_method: subscription.payment_method ?? "",
    payment_card_id: subscription.payment_card_id ?? "",
    collection_account_id: subscription.collection_account_id ?? "",
    status: subscription.status,
    auto_renew: subscription.auto_renew ? "on" : "",
    memo: subscription.memo ?? "",
  };
}

export type PaymentOptions = { accounts: BankAccount[]; cards: PaymentCard[] };

export const emptyFormValues: FormValues = {
  split_count: "1",
  currency: "KRW",
  billing_cycle: "monthly",
  status: "active",
  auto_renew: "on",
};

function SubscriptionForm({
  action,
  values,
  errors,
  submitLabel,
  options,
}: {
  action: string;
  values: FormValues;
  errors: string[];
  submitLabel: string;
  options: PaymentOptions;
}) {
  const value = (key: string) => values[key] ?? "";

  return (
    <form method="post" action={action} class="grid gap-6">
      {errors.length ? (
        <Notice tone="error">
          <ul class="list-inside list-disc">
            {errors.map((error) => (
              <li>{error}</li>
            ))}
          </ul>
        </Notice>
      ) : null}

      <section class="grid gap-4 rounded-lg border border-white/10 bg-zinc-900 p-5">
        <div class="grid gap-4 md:grid-cols-2">
          <Field label="서비스 이름">
            <input class={inputClass} name="name" value={value("name")} maxlength={200} required />
          </Field>

          <Field label="카테고리">
            <input
              class={inputClass}
              name="category"
              value={value("category")}
              maxlength={200}
              placeholder="예: 개발, 영상, 음악"
            />
          </Field>

          <Field label="전체 결제금액">
            <input
              class={inputClass}
              name="price"
              type="number"
              min="0"
              step="0.01"
              inputmode="decimal"
              value={value("price")}
              required
            />
          </Field>

          <Field label="나누는 인원 수">
            <input
              class={inputClass}
              name="split_count"
              type="number"
              min="1"
              max="99"
              step="1"
              inputmode="numeric"
              value={value("split_count") || "1"}
              required
            />
          </Field>

          <Field label="통화">
            <input
              class={`${inputClass} uppercase`}
              name="currency"
              value={value("currency") || "KRW"}
              minlength={3}
              maxlength={3}
              pattern="[A-Za-z]{3}"
              title="KRW, USD 같은 3자리 통화 코드"
              required
            />
          </Field>

          <Field label="결제 주기">
            <select class={inputClass} name="billing_cycle" required>
              {Object.entries(billingCycleLabels).map(([cycle, label]) => (
                <option value={cycle} selected={value("billing_cycle") === cycle}>
                  {label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="다음 결제일">
            <input
              class={inputClass}
              name="next_billing_date"
              type="date"
              value={value("next_billing_date")}
              required
            />
          </Field>

          <Field label="결제 카드">
            <select class={inputClass} name="payment_card_id">
              <option value="">선택 안 함</option>
              {options.cards.map((card) => (
                <option value={card.id} selected={value("payment_card_id") === card.id}>
                  {cardLabel(card)}
                </option>
              ))}
            </select>
          </Field>

          <Field label="수금 계좌 (1/N일 때)">
            <select class={inputClass} name="collection_account_id">
              <option value="">선택 안 함</option>
              {options.accounts.map((account) => (
                <option value={account.id} selected={value("collection_account_id") === account.id}>
                  {accountLabel(account)}
                </option>
              ))}
            </select>
          </Field>

          <Field label="기타 결제 수단 메모">
            <input
              class={inputClass}
              name="payment_method"
              value={value("payment_method")}
              maxlength={200}
              placeholder="카드 미등록 시: 예) PayPal, 통신사 결제"
            />
          </Field>

          <Field label="상태">
            <select class={inputClass} name="status">
              {Object.entries(statusLabels).map(([status, label]) => (
                <option value={status} selected={(value("status") || "active") === status}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {options.cards.length || options.accounts.length ? null : (
          <p class="text-sm text-zinc-500">
            결제 카드와 수금 계좌는{" "}
            <a href="/payments" class="font-semibold text-cyan-300 hover:text-cyan-200">
              결제수단
            </a>
            에서 먼저 등록하세요.
          </p>
        )}

        <label class="flex items-center gap-3 text-sm font-medium text-zinc-300">
          <input
            class="h-4 w-4 rounded border-white/15 accent-cyan-400"
            type="checkbox"
            name="auto_renew"
            checked={value("auto_renew") === "on"}
          />
          자동 갱신
        </label>

        <Field label="메모">
          <textarea class={textareaClass} name="memo" maxlength={2000}>
            {value("memo")}
          </textarea>
        </Field>
      </section>

      <div class="flex justify-end gap-2">
        <LinkButton href="/subscriptions" variant="ghost">
          취소
        </LinkButton>
        <Button>{submitLabel}</Button>
      </div>
    </form>
  );
}

export function NewSubscriptionPage({
  values,
  options,
  errors = [],
}: {
  values: FormValues;
  options: PaymentOptions;
  errors?: string[];
}) {
  return (
    <>
      <PageHeader
        title="구독 추가"
        description="필수 항목은 서비스 이름, 가격, 결제 주기, 다음 결제일입니다."
        action={
          <LinkButton href="/subscriptions" variant="secondary">
            목록으로
          </LinkButton>
        }
      />
      <SubscriptionForm action="/subscriptions" values={values} errors={errors} submitLabel="추가" options={options} />
    </>
  );
}

export function EditSubscriptionPage({
  id,
  name,
  values,
  options,
  errors = [],
}: {
  id: string;
  name: string;
  values: FormValues;
  options: PaymentOptions;
  errors?: string[];
}) {
  return (
    <>
      <PageHeader
        title="구독 수정"
        description={`${name} 정보를 수정합니다.`}
        action={
          <LinkButton href="/subscriptions" variant="secondary">
            목록으로
          </LinkButton>
        }
      />
      <SubscriptionForm
        action={`/subscriptions/${id}`}
        values={values}
        errors={errors}
        submitLabel="저장"
        options={options}
      />
    </>
  );
}
