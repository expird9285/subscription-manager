import type { Child } from "hono/jsx";

import { displayNameOf } from "../../db/users";
import type { ExchangeRates } from "../../lib/exchange-rates";
import type { User } from "../../lib/types";
import { Bot, CircleCheck, Clock, Database, Download, Icon, RefreshCw, Send, ShieldCheck } from "../icons";
import { Badge, Button, LinkButton, Notice, PageHeader } from "../ui";

export type SettingsView = {
  user: User;
  allowedCount: number;
  discord: {
    clientId: boolean;
    clientSecret: boolean;
    publicKey: boolean;
    botToken: boolean;
    alertChannelId: string;
    guildId: string;
  };
  interactionsUrl: string;
  timeZone: string;
  alertHour: number;
  lastAlertAt: string | null;
  rates: ExchangeRates;
  subscriptionCount: number;
};

const notices: Record<string, { tone: "info" | "error"; text: string }> = {
  commands_registered: { tone: "info", text: "Discord 슬래시 명령어를 등록했습니다." },
  commands_failed: {
    tone: "error",
    text: "슬래시 명령어 등록에 실패했습니다. DISCORD_CLIENT_ID, DISCORD_BOT_TOKEN, DISCORD_GUILD_ID를 확인해 주세요.",
  },
  test_sent: { tone: "info", text: "알림 채널로 테스트 메시지를 보냈습니다." },
  test_failed: {
    tone: "error",
    text: "테스트 메시지 전송에 실패했습니다. 봇이 채널에 접근할 수 있는지와 DISCORD_ALERT_CHANNEL_ID를 확인해 주세요.",
  },
};

function status(ok: boolean, okLabel = "설정됨", missingLabel = "미설정") {
  return <Badge tone={ok ? "emerald" : "amber"}>{ok ? okLabel : missingLabel}</Badge>;
}

function SettingBlock({
  icon,
  title,
  rows,
  footer,
}: {
  icon: Child;
  title: string;
  rows: [string, Child][];
  footer?: Child;
}) {
  return (
    <section class="rounded-lg border border-white/10 bg-zinc-900 p-5">
      <div class="mb-4 flex items-center gap-3 text-zinc-50">
        <div class="text-cyan-300">{icon}</div>
        <h3 class="text-sm font-semibold">{title}</h3>
      </div>
      <dl class="grid gap-3">
        {rows.map(([label, value]) => (
          <div class="grid gap-1 border-t border-white/10 pt-3 sm:grid-cols-[200px_1fr]">
            <dt class="text-sm font-medium text-zinc-500">{label}</dt>
            <dd class="break-all text-sm font-semibold text-zinc-100">{value}</dd>
          </div>
        ))}
      </dl>
      {footer ? <div class="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-4">{footer}</div> : null}
    </section>
  );
}

export function SettingsPage({ view, notice }: { view: SettingsView; notice?: string }) {
  const message = notice ? notices[notice] : undefined;
  const { discord } = view;
  const botReady = discord.clientId && discord.botToken && discord.publicKey;

  return (
    <>
      <PageHeader
        title="설정"
        description="계정, 접근 제어, Discord 봇과 알림, 데이터 상태를 확인합니다. 값은 Worker 시크릿과 wrangler.jsonc에서 관리합니다."
      />
      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}

      <section class="grid gap-4 lg:grid-cols-2">
        <SettingBlock
          icon={<Icon icon={ShieldCheck} class="h-5 w-5" />}
          title="계정과 접근 제어"
          rows={[
            ["현재 사용자", `${displayNameOf(view.user)} (@${view.user.username})`],
            ["Discord ID", <code class="font-mono">{view.user.discord_id}</code>],
            ["ALLOWED_DISCORD_IDS", `${view.allowedCount}명 허용`],
            ["로그인 방식", "Discord OAuth (identify)"],
            ["세션", "D1 저장 · 30일 · HttpOnly 쿠키"],
          ]}
        />

        <SettingBlock
          icon={<Icon icon={Bot} class="h-5 w-5" />}
          title="Discord 봇"
          rows={[
            ["DISCORD_CLIENT_ID", status(discord.clientId)],
            ["DISCORD_CLIENT_SECRET", status(discord.clientSecret)],
            ["DISCORD_PUBLIC_KEY", status(discord.publicKey)],
            ["DISCORD_BOT_TOKEN", status(discord.botToken)],
            ["알림 채널 ID", discord.alertChannelId || status(false)],
            ["명령어 등록 범위", discord.guildId ? `서버 ${discord.guildId}` : "전역 (DISCORD_GUILD_ID 비어 있음)"],
            ["Interactions Endpoint URL", <code class="font-mono text-cyan-200">{view.interactionsUrl}</code>],
          ]}
          footer={
            <>
              <form method="post" action="/settings/discord/commands">
                <Button variant="secondary" class={botReady ? undefined : "opacity-60"}>
                  <Icon icon={RefreshCw} />
                  슬래시 명령어 등록
                </Button>
              </form>
              <form method="post" action="/settings/discord/test-alert">
                <Button variant="secondary">
                  <Icon icon={Send} />
                  테스트 알림 보내기
                </Button>
              </form>
            </>
          }
        />

        <SettingBlock
          icon={<Icon icon={Clock} class="h-5 w-5" />}
          title="결제 알림과 환율"
          rows={[
            ["알림 시점", "결제 7일 전 · 3일 전 · 1일 전 · 당일"],
            ["발송 시각", `매일 ${view.alertHour}시 이후 첫 확인 (${view.timeZone})`],
            ["확인 주기", "Cron Trigger 매시 정각"],
            ["마지막 알림", view.lastAlertAt ?? "없음"],
            [
              "환율",
              view.rates.source === "live"
                ? `Frankfurter · 기준일 ${view.rates.date}`
                : "임시 환율 (아직 불러오지 못함)",
            ],
          ]}
        />

        <SettingBlock
          icon={<Icon icon={Database} class="h-5 w-5" />}
          title="데이터"
          rows={[
            ["저장소", "Cloudflare D1 (subscription-manager)"],
            ["내 구독 수", `${view.subscriptionCount}개`],
            ["백업", "D1 Time Travel + JSON 내보내기"],
          ]}
          footer={
            <LinkButton href="/settings/export" variant="secondary">
              <Icon icon={Download} />
              JSON 내보내기
            </LinkButton>
          }
        />
      </section>

      <section class="mt-4 rounded-lg border border-white/10 bg-zinc-900 p-5">
        <div class="mb-4 flex items-center gap-3">
          <Icon icon={CircleCheck} class="h-5 w-5 text-cyan-300" />
          <h3 class="text-sm font-semibold text-zinc-50">현재 상태</h3>
        </div>
        <div class="flex flex-wrap gap-2">
          <Badge tone="emerald">로그인 필요</Badge>
          <Badge tone="emerald">Discord OAuth only</Badge>
          <Badge tone={view.allowedCount > 0 ? "emerald" : "amber"}>허용 목록 적용</Badge>
          <Badge tone="emerald">사용자별 데이터 분리</Badge>
          <Badge tone="emerald">CSRF 보호</Badge>
          <Badge tone={botReady ? "emerald" : "amber"}>Discord 봇 {botReady ? "준비됨" : "설정 필요"}</Badge>
        </div>
      </section>
    </>
  );
}
