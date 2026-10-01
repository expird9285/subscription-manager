import { accountTransferLine } from "../../lib/payments";
import { billingCycleLabels, formatAmount, sharedPrice, splitCount } from "../../lib/subscriptions";
import type { BankAccount, Subscription } from "../../lib/types";
import { Copy, Icon, Landmark, Link, RefreshCw } from "../icons";
import { Document, StandalonePage } from "../layout";
import { Button, buttonClass, inputClass, LinkButton, Notice, PageHeader, textareaClass } from "../ui";

const notices: Record<string, string> = {
  link_created: "공유 링크를 만들었습니다.",
  link_rotated: "새 공유 링크를 발급했습니다. 이전 링크는 더 이상 열리지 않습니다.",
  link_disabled: "공유 링크를 껐습니다.",
};

/** Copy button handled by public/assets/app.js; shows "복사됨" briefly after copying. */
export function CopyButton({
  target,
  text,
  label = "복사",
  variant = "secondary",
}: {
  target?: string;
  text?: string;
  label?: string;
  variant?: "primary" | "secondary";
}) {
  return (
    <button
      type="button"
      class={buttonClass(variant, "group/copy")}
      data-copy={target}
      data-copy-text={text}
    >
      <Icon icon={Copy} />
      <span class="group-data-[copied=true]/copy:hidden">{label}</span>
      <span class="hidden group-data-[copied=true]/copy:inline">복사됨</span>
    </button>
  );
}

export function SharePage({
  subscription,
  account,
  text,
  shareUrl,
  notice,
}: {
  subscription: Subscription;
  account: BankAccount | null;
  text: string;
  shareUrl: string | null;
  notice?: string;
}) {
  const message = notice ? notices[notice] : undefined;
  const base = `/subscriptions/${subscription.id}/share`;

  return (
    <>
      <PageHeader
        title="수금 안내"
        description={`${subscription.name}을(를) 함께 쓰는 사람들에게 보낼 정산 안내입니다.`}
        action={
          <LinkButton href={`/subscriptions/${subscription.id}/edit`} variant="secondary">
            구독 수정
          </LinkButton>
        }
      />
      {message ? <Notice>{message}</Notice> : null}
      {splitCount(subscription) < 2 ? (
        <Notice tone="error">
          1/N 구독이 아닙니다. 구독 수정에서 나누는 인원 수를 2명 이상으로 바꾸면 1인당 금액이 계산됩니다.
        </Notice>
      ) : null}
      {account ? null : (
        <Notice tone="error">
          수금 계좌가 지정되지 않았습니다. 구독 수정에서 &quot;수금 계좌&quot;를 고르면 안내에 입금 계좌가 들어갑니다.
        </Notice>
      )}

      <div class="grid gap-6 lg:grid-cols-2">
        <section class="rounded-lg border border-white/10 bg-zinc-900 p-5">
          <h3 class="text-sm font-semibold text-zinc-50">복사용 문구</h3>
          <p class="mt-1 text-sm text-zinc-500">단톡방이나 DM에 그대로 붙여넣으세요.</p>
          <textarea id="collection-text" class={`${textareaClass} mt-4 min-h-36 w-full font-mono`} readonly rows={5}>
            {text}
          </textarea>
          <div class="mt-3 flex justify-end">
            <CopyButton target="#collection-text" label="문구 복사" variant="primary" />
          </div>
        </section>

        <section class="rounded-lg border border-white/10 bg-zinc-900 p-5">
          <h3 class="flex items-center gap-2 text-sm font-semibold text-zinc-50">
            <Icon icon={Link} class="h-4 w-4 text-cyan-300" />
            공유 링크
          </h3>
          <p class="mt-1 text-sm leading-6 text-zinc-500">
            링크를 아는 사람은 로그인 없이 1인당 금액, 다음 결제일, 입금 계좌를 볼 수 있습니다. 메모, 결제 카드, 다른
            구독은 보이지 않습니다. 단톡방 공지에 걸어두기 좋습니다.
          </p>

          {shareUrl ? (
            <>
              <input id="share-url" class={`${inputClass} mt-4 w-full font-mono`} value={shareUrl} readonly />
              <div class="mt-3 flex flex-wrap justify-end gap-2">
                <a href={shareUrl} class={buttonClass("ghost")} target="_blank" rel="noopener">
                  열어보기
                </a>
                <form method="post" action={`${base}/link/rotate`} data-confirm="새 링크를 발급할까요? 기존 링크는 더 이상 열리지 않습니다.">
                  <Button variant="secondary">
                    <Icon icon={RefreshCw} />새 링크
                  </Button>
                </form>
                <form method="post" action={`${base}/link/disable`} data-confirm="공유 링크를 끌까요? 링크를 받은 사람은 더 이상 볼 수 없습니다.">
                  <Button variant="secondary">끄기</Button>
                </form>
                <CopyButton target="#share-url" label="링크 복사" variant="primary" />
              </div>
            </>
          ) : (
            <form method="post" action={`${base}/link`} class="mt-4 flex justify-end">
              <Button>
                <Icon icon={Link} />
                공유 링크 만들기
              </Button>
            </form>
          )}
        </section>
      </div>
    </>
  );
}

export function PublicSharePage({
  subscription,
  account,
}: {
  subscription: Subscription;
  account: BankAccount | null;
}) {
  const { currency } = subscription;
  const count = splitCount(subscription);

  return (
    <Document title={`${subscription.name} 정산 안내`} noindex>
      <StandalonePage>
        <section class="w-full max-w-md rounded-lg border border-white/10 bg-zinc-950/90 p-6 shadow-2xl shadow-black/40">
          <p class="text-sm font-medium text-cyan-300">구독료 정산 안내</p>
          <h1 class="mt-1 break-keep text-2xl font-semibold tracking-tight text-zinc-50">{subscription.name}</h1>

          <div class="mt-6 rounded-lg bg-zinc-900 p-4">
            <p class="text-sm text-zinc-400">1인당 보낼 금액</p>
            <p class="mt-1 text-3xl font-semibold tracking-tight text-zinc-50">
              {formatAmount(sharedPrice(subscription), currency)}
            </p>
            <p class="mt-2 text-sm text-zinc-500">
              전체 {formatAmount(subscription.price, currency)} ÷ {count}명
            </p>
          </div>

          <dl class="mt-4 grid gap-3 text-sm">
            <div class="flex justify-between gap-4 border-t border-white/10 pt-3">
              <dt class="text-zinc-500">다음 결제일</dt>
              <dd class="font-semibold text-zinc-100">{subscription.next_billing_date}</dd>
            </div>
            <div class="flex justify-between gap-4 border-t border-white/10 pt-3">
              <dt class="text-zinc-500">결제 주기</dt>
              <dd class="font-semibold text-zinc-100">{billingCycleLabels[subscription.billing_cycle]}</dd>
            </div>
          </dl>

          <div class="mt-5 rounded-lg border border-white/10 p-4">
            <p class="flex items-center gap-2 text-sm font-semibold text-zinc-50">
              <Icon icon={Landmark} class="h-4 w-4 text-cyan-300" />
              입금 계좌
            </p>
            {account ? (
              <>
                <p class="mt-2 break-keep text-base font-semibold text-zinc-100">{accountTransferLine(account)}</p>
                {account.account_number ? (
                  <div class="mt-3 flex justify-end">
                    <CopyButton text={account.account_number} label="계좌번호 복사" />
                  </div>
                ) : null}
              </>
            ) : (
              <p class="mt-2 text-sm text-zinc-400">입금 계좌가 아직 지정되지 않았습니다. 정산을 요청한 사람에게 문의해 주세요.</p>
            )}
          </div>
        </section>
      </StandalonePage>
    </Document>
  );
}
