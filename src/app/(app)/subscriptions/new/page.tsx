import Link from "next/link";

import { createSubscription } from "@/app/actions/subscriptions";
import { SubscriptionForm } from "@/components/subscription-form";
import { PageHeader } from "@/components/ui";

export default function NewSubscriptionPage() {
  return (
    <>
      <PageHeader
        title="구독 추가"
        description="필수 항목은 서비스 이름, 가격, 결제 주기, 다음 결제일입니다."
        action={
          <Link
            href="/subscriptions"
            className="inline-flex h-10 items-center justify-center rounded-md border border-white/10 bg-zinc-900 px-4 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-950"
          >
            목록으로
          </Link>
        }
      />
      <SubscriptionForm action={createSubscription} submitLabel="추가" />
    </>
  );
}
