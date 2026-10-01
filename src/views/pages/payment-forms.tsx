import { accountLabel } from "../../lib/payments";
import type { BankAccount, PaymentCard } from "../../lib/types";
import type { FormValues } from "../../lib/validation";
import { Button, Field, inputClass, LinkButton, Notice, PageHeader, textareaClass } from "../ui";

export function accountToValues(account: BankAccount): FormValues {
  return {
    bank_name: account.bank_name,
    nickname: account.nickname ?? "",
    account_number: account.account_number ?? "",
    holder_name: account.holder_name ?? "",
    memo: account.memo ?? "",
  };
}

export function cardToValues(card: PaymentCard): FormValues {
  return {
    name: card.name,
    last4: card.last4 ?? "",
    bank_account_id: card.bank_account_id ?? "",
    memo: card.memo ?? "",
  };
}

function Errors({ errors }: { errors: string[] }) {
  return errors.length ? (
    <Notice tone="error">
      <ul class="list-inside list-disc">
        {errors.map((error) => (
          <li>{error}</li>
        ))}
      </ul>
    </Notice>
  ) : null;
}

function FormActions({ submitLabel }: { submitLabel: string }) {
  return (
    <div class="flex justify-end gap-2">
      <LinkButton href="/payments" variant="ghost">
        취소
      </LinkButton>
      <Button>{submitLabel}</Button>
    </div>
  );
}

export function AccountFormPage({
  title,
  action,
  values,
  errors = [],
  submitLabel,
}: {
  title: string;
  action: string;
  values: FormValues;
  errors?: string[];
  submitLabel: string;
}) {
  const value = (key: string) => values[key] ?? "";
  return (
    <>
      <PageHeader
        title={title}
        description="카드 대금이 빠져나가는 계좌나 1/N 구독료를 받을 계좌를 등록합니다. 계좌번호와 예금주는 수금 안내에 표시됩니다."
      />
      <form method="post" action={action} class="grid gap-6">
        <Errors errors={errors} />
        <section class="grid gap-4 rounded-lg border border-white/10 bg-zinc-900 p-5 md:grid-cols-2">
          <Field label="은행">
            <input class={inputClass} name="bank_name" value={value("bank_name")} maxlength={200} placeholder="예: 국민은행" required />
          </Field>
          <Field label="별칭">
            <input class={inputClass} name="nickname" value={value("nickname")} maxlength={200} placeholder="예: 월급통장, 생활비" />
          </Field>
          <Field label="계좌번호">
            <input
              class={inputClass}
              name="account_number"
              value={value("account_number")}
              maxlength={40}
              inputmode="numeric"
              placeholder="예: 123-456-789012"
            />
          </Field>
          <Field label="예금주">
            <input class={inputClass} name="holder_name" value={value("holder_name")} maxlength={200} />
          </Field>
          <div class="md:col-span-2">
            <Field label="메모">
              <textarea class={textareaClass} name="memo" maxlength={2000}>
                {value("memo")}
              </textarea>
            </Field>
          </div>
        </section>
        <FormActions submitLabel={submitLabel} />
      </form>
    </>
  );
}

export function CardFormPage({
  title,
  action,
  values,
  accounts,
  errors = [],
  submitLabel,
}: {
  title: string;
  action: string;
  values: FormValues;
  accounts: BankAccount[];
  errors?: string[];
  submitLabel: string;
}) {
  const value = (key: string) => values[key] ?? "";
  return (
    <>
      <PageHeader
        title={title}
        description="구독료가 결제되는 카드와, 카드 대금이 빠져나가는 계좌를 연결합니다."
      />
      <form method="post" action={action} class="grid gap-6">
        <Errors errors={errors} />
        <section class="grid gap-4 rounded-lg border border-white/10 bg-zinc-900 p-5 md:grid-cols-2">
          <Field label="카드 이름">
            <input class={inputClass} name="name" value={value("name")} maxlength={200} placeholder="예: 현대카드 ZERO" required />
          </Field>
          <Field label="카드 끝 4자리 (선택)">
            <input
              class={inputClass}
              name="last4"
              value={value("last4")}
              maxlength={4}
              inputmode="numeric"
              pattern="[0-9]{4}"
              title="숫자 4자리"
            />
          </Field>
          <Field label="연결 계좌">
            <select class={inputClass} name="bank_account_id">
              <option value="">연결 안 함</option>
              {accounts.map((account) => (
                <option value={account.id} selected={value("bank_account_id") === account.id}>
                  {accountLabel(account)}
                </option>
              ))}
            </select>
          </Field>
          {accounts.length ? null : (
            <p class="self-end text-sm text-zinc-500">
              등록된 계좌가 없습니다.{" "}
              <a href="/payments/accounts/new" class="font-semibold text-cyan-300 hover:text-cyan-200">
                계좌 먼저 추가하기
              </a>
            </p>
          )}
          <div class="md:col-span-2">
            <Field label="메모">
              <textarea class={textareaClass} name="memo" maxlength={2000}>
                {value("memo")}
              </textarea>
            </Field>
          </div>
        </section>
        <FormActions submitLabel={submitLabel} />
      </form>
    </>
  );
}
