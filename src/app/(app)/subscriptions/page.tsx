import { Plus } from "lucide-react";
import Link from "next/link";

import { SubscriptionFilters } from "@/components/subscription-filters";
import { SubscriptionTable } from "@/components/subscription-table";
import { PageHeader } from "@/components/ui";
import { getSubscriptions } from "@/lib/dal";
import { filterAndSortSubscriptions } from "@/lib/subscriptions";

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const subscriptions = await getSubscriptions();
  const filters = {
    query: typeof params.q === "string" ? params.q : "",
    category: typeof params.category === "string" ? params.category : "",
    status: typeof params.status === "string" ? params.status : "",
    billingCycle:
      typeof params.billingCycle === "string" ? params.billingCycle : "",
    sort: typeof params.sort === "string" ? params.sort : "next_billing_asc",
  };
  const categories = Array.from(
    new Set(
      subscriptions.map((subscription) => subscription.category || "미분류"),
    ),
  ).sort((a, b) => a.localeCompare(b, "ko-KR"));
  const filtered = filterAndSortSubscriptions(subscriptions, filters);

  return (
    <>
      <PageHeader
        title="구독 목록"
        description="검색, 필터, 정렬로 현재 구독 상태와 결제 예정일을 관리합니다."
        action={
          <Link
            href="/subscriptions/new"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-cyan-400 px-4 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-300"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            추가
          </Link>
        }
      />
      <SubscriptionFilters categories={categories} filters={filters} />
      <SubscriptionTable subscriptions={filtered} />
    </>
  );
}
