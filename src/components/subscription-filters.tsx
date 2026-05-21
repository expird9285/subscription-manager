import { Search } from "lucide-react";

import { Button, inputClass } from "@/components/ui";
import { billingCycleLabels, statusLabels } from "@/lib/subscriptions";

export function SubscriptionFilters({
  categories,
  filters,
}: {
  categories: string[];
  filters: {
    query?: string;
    category?: string;
    status?: string;
    billingCycle?: string;
    sort?: string;
  };
}) {
  return (
    <form className="mb-4 grid gap-3 rounded-lg border border-white/10 bg-zinc-900 p-4 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr_auto]">
      <label className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-zinc-500"
          aria-hidden="true"
        />
        <input
          className={`${inputClass} w-full pl-9`}
          name="q"
          defaultValue={filters.query}
          placeholder="서비스 검색"
        />
      </label>

      <select className={inputClass} name="category" defaultValue={filters.category}>
        <option value="">전체 카테고리</option>
        {categories.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>

      <select className={inputClass} name="status" defaultValue={filters.status}>
        <option value="">전체 상태</option>
        {Object.entries(statusLabels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      <select
        className={inputClass}
        name="billingCycle"
        defaultValue={filters.billingCycle}
      >
        <option value="">전체 주기</option>
        {Object.entries(billingCycleLabels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      <select className={inputClass} name="sort" defaultValue={filters.sort}>
        <option value="next_billing_asc">결제일 가까운 순</option>
        <option value="price_desc">가격 높은 순</option>
        <option value="monthly_desc">월 환산 높은 순</option>
        <option value="name_asc">이름순</option>
      </select>

      <Button type="submit" variant="secondary">
        적용
      </Button>
    </form>
  );
}
