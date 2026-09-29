import { Icon, MessageCircle } from "../icons";
import { Document, StandalonePage } from "../layout";
import { buttonClass, Notice } from "../ui";

const errors: Record<string, string> = {
  discord: "Discord 로그인 요청을 시작하지 못했습니다. 서버 설정을 확인해 주세요.",
  callback: "Discord 인증을 완료하지 못했습니다. 다시 시도해 주세요.",
  state: "로그인 요청이 만료되었거나 올바르지 않습니다. 다시 시도해 주세요.",
  denied: "Discord 로그인이 취소되었습니다.",
  not_allowed: "허용된 Discord 계정만 사용할 수 있습니다.",
};

export function LoginPage({
  error,
  discordId,
  next,
}: {
  error?: string;
  discordId?: string;
  next: string;
}) {
  const message = error ? errors[error] : undefined;
  const showDiscordId = error === "not_allowed" && discordId && /^\d{5,25}$/.test(discordId);

  return (
    <Document title="로그인">
      <StandalonePage>
        <section class="w-full max-w-md rounded-lg border border-white/10 bg-zinc-950/90 p-6 shadow-2xl shadow-black/40 backdrop-blur">
          <div class="mb-7 flex items-center gap-3">
            <div class="flex h-11 w-11 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-300">
              <Icon icon={MessageCircle} class="h-5 w-5" />
            </div>
            <div>
              <p class="text-sm font-medium text-cyan-300">구독 관리</p>
              <h1 class="text-xl font-semibold tracking-tight text-zinc-50">Discord 로그인</h1>
            </div>
          </div>

          {message ? (
            <Notice tone="error">
              {message}
              {showDiscordId ? (
                <span class="mt-2 block text-xs font-normal text-rose-100/80">
                  이 계정의 Discord ID는 <code class="font-mono font-semibold">{discordId}</code> 입니다.
                  Worker 시크릿 <code class="font-mono">ALLOWED_DISCORD_IDS</code>에 추가하면 로그인할 수
                  있습니다.
                </span>
              ) : null}
            </Notice>
          ) : null}

          <a
            href={`/auth/discord?next=${encodeURIComponent(next)}`}
            class={buttonClass("discord", "h-11 w-full")}
          >
            <Icon icon={MessageCircle} class="h-4 w-4" />
            Discord로 계속하기
          </a>
        </section>
      </StandalonePage>
    </Document>
  );
}
