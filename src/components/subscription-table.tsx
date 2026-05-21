import { Pencil, Trash2 } from "lucide-react";
import Link from "next/link";

import {
  deleteSubscription,
  toggleAutoRenew,
  updateSubscriptionStatus,
} from "@/app/actions/subscriptions";
import { Badge, Button, inputClass } from "@/components/ui";
import type { Subscription } from "@/lib/database.types";
import {
  billingCycleLabels,
  dueLabel,
  formatMoney,
  monthlyAmount,
  statusLabels,
} from "@/lib/subscriptions";

function statusTone(status: Subscription["status"]): "slate" | "emerald" | "amber" | "rose" | "sky" {
  switch (status) {
    case "active":
      return "emerald";
    case "trial":
      return "sky";
    case "cancel_pending":
      return "amber";
    case "cancelled":
      return "rose";
    default:
      return "slate";
  }
}

export function SubscriptionTable({
  subscriptions,
}: {
  subscriptions: Subscription[];
}) {
  if (!subscriptions.length) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="text-sm font-medium text-slate-600">
          표시할 구독이 없습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="min-w-[1080px] w-full border-collapse text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">서비스</th>
            <th className="px-4 py-3">카테고리</th>
            <th className="px-4 py-3">가격</th>
            <th className="px-4 py-3">월 환산</th>
            <th className="px-4 py-3">주기</th>
            <th className="px-4 py-3">다음 결제일</th>
            <th className="px-4 py-3">상태</th>
            <th className="px-4 py-3">자동 갱신</th>
            <th className="px-4 py-3">결제 수단</th>
            <th className="px-4 py-3 text-right">작업</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {subscriptions.map((subscription) => (
            <tr key={subscription.id} className="align-top">
              <td className="px-4 py-3 font-semibold text-slate-950">
                {subscription.name}
                {subscription.memo ? (
                  <p className="mt-1 max-w-56 truncate text-xs font-normal text-slate-500">
                    {subscription.memo}
                  </p>
                ) : null}
              </td>
              <td className="px-4 py-3 text-slate-600">
                {subscription.category || "미분류"}
              </td>
              <td className="px-4 py-3 text-slate-700">
                {formatMoney(subscription.price, subscription.currency)}
              </td>
              <td className="px-4 py-3 text-slate-700">
                {formatMoney(monthlyAmount(subscription), subscription.currency)}
              </td>
              <td className="px-4 py-3 text-slate-600">
                {billingCycleLabels[subscription.billing_cycle]}
              </td>
              <td className="px-4 py-3">
                <div className="font-medium text-slate-800">
                  {subscription.next_billing_date}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {dueLabel(subscription.next_billing_date)}
                </div>
              </td>
              <td className="px-4 py-3">
                <form action={updateSubscriptionStatus} className="flex gap-2">
                  <input type="hidden" name="id" value={subscription.id} />
                  <select
                    className={`${inputClass} h-9 min-w-28`}
                    name="status"
                    defaultValue={subscription.status}
                  >
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <Button className="h-9 px-3" variant="secondary">
                    저장
                  </Button>
                </form>
                <div className="mt-2">
                  <Badge tone={statusTone(subscription.status)}>
                    {statusLabels[subscription.status]}
                  </Badge>
                </div>
              </td>
              <td className="px-4 py-3">
                <form action={toggleAutoRenew}>
                  <input type="hidden" name="id" value={subscription.id} />
                  <input
                    type="hidden"
                    name="auto_renew"
                    value={subscription.auto_renew ? "false" : "true"}
                  />
                  <Button className="h-9 px-3" variant="secondary">
                    {subscription.auto_renew ? "켜짐" : "꺼짐"}
                  </Button>
                </form>
              </td>
              <td className="px-4 py-3 text-slate-600">
                {subscription.payment_method || "-"}
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-2">
                  <Link
                    href={`/subscriptions/${subscription.id}/edit`}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-700 transition hover:bg-slate-50"
                    title="수정"
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </Link>
                  <form action={deleteSubscription}>
                    <input type="hidden" name="id" value={subscription.id} />
                    <button
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-rose-200 text-rose-700 transition hover:bg-rose-50"
                      title="삭제"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </form>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
