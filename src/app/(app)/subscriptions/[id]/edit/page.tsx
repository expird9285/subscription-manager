import { notFound } from "next/navigation";
import Link from "next/link";

import { updateSubscription } from "@/app/actions/subscriptions";
import { SubscriptionForm } from "@/components/subscription-form";
import { PageHeader } from "@/components/ui";
import { getSubscription } from "@/lib/dal";

export default async function EditSubscriptionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const subscription = await getSubscription(id);

  if (!subscription) {
    notFound();
  }

  const updateAction = updateSubscription.bind(null, subscription.id);

  return (
    <>
      <PageHeader
        title="구독 수정"
        description={`${subscription.name} 정보를 수정합니다.`}
        action={
          <Link
            href="/subscriptions"
            className="inline-flex h-10 items-center justify-center rounded-md border border-white/10 bg-zinc-900 px-4 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-950"
          >
            목록으로
          </Link>
        }
      />
      <SubscriptionForm
        action={updateAction}
        subscription={subscription}
        submitLabel="저장"
      />
    </>
  );
}
