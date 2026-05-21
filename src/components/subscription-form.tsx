import type { Subscription } from "@/lib/database.types";
import { Field, inputClass, textareaClass, Button } from "@/components/ui";
import { billingCycleLabels, statusLabels } from "@/lib/subscriptions";

const billingCycles = Object.entries(billingCycleLabels);
const statuses = Object.entries(statusLabels);

export function SubscriptionForm({
  action,
  subscription,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  subscription?: Subscription | null;
  submitLabel: string;
}) {
  return (
    <form action={action} className="grid gap-6">
      <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="서비스 이름">
            <input
              className={inputClass}
              name="name"
              defaultValue={subscription?.name ?? ""}
              required
            />
          </Field>

          <Field label="카테고리">
            <input
              className={inputClass}
              name="category"
              defaultValue={subscription?.category ?? ""}
              placeholder="예: 개발, 영상, 음악"
            />
          </Field>

          <Field label="가격">
            <input
              className={inputClass}
              name="price"
              type="number"
              min="0"
              step="0.01"
              defaultValue={subscription?.price ?? ""}
              required
            />
          </Field>

          <Field label="통화">
            <input
              className={inputClass}
              name="currency"
              defaultValue={subscription?.currency ?? "KRW"}
              maxLength={8}
              required
            />
          </Field>

          <Field label="결제 주기">
            <select
              className={inputClass}
              name="billing_cycle"
              defaultValue={subscription?.billing_cycle ?? "monthly"}
              required
            >
              {billingCycles.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="다음 결제일">
            <input
              className={inputClass}
              name="next_billing_date"
              type="date"
              defaultValue={subscription?.next_billing_date ?? ""}
              required
            />
          </Field>

          <Field label="결제 수단">
            <input
              className={inputClass}
              name="payment_method"
              defaultValue={subscription?.payment_method ?? ""}
              placeholder="예: 현대카드, PayPal"
            />
          </Field>

          <Field label="상태">
            <select
              className={inputClass}
              name="status"
              defaultValue={subscription?.status ?? "active"}
            >
              {statuses.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
          <input
            className="h-4 w-4 rounded border-slate-300 text-emerald-600"
            type="checkbox"
            name="auto_renew"
            defaultChecked={subscription?.auto_renew ?? true}
          />
          자동 갱신
        </label>

        <Field label="메모">
          <textarea
            className={textareaClass}
            name="memo"
            defaultValue={subscription?.memo ?? ""}
          />
        </Field>
      </section>

      <div className="flex justify-end gap-2">
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
