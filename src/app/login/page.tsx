import { MessageCircle } from "lucide-react";

import { signInWithDiscord } from "@/app/actions/auth";
import { Button } from "@/components/ui";

const errors: Record<string, string> = {
  discord: "Discord 로그인 요청을 시작하지 못했습니다.",
  callback: "Discord 인증을 완료하지 못했습니다.",
  not_allowed: "허용된 Discord 계정만 사용할 수 있습니다.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const errorKey = typeof params.error === "string" ? params.error : "";
  const next = typeof params.next === "string" ? params.next : "/dashboard";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_20%_10%,rgba(99,102,241,0.22),transparent_34%),radial-gradient(circle_at_80%_0%,rgba(6,182,212,0.18),transparent_28%),#050505] p-4">
      <section className="w-full max-w-md rounded-lg border border-white/10 bg-zinc-950/90 p-6 shadow-2xl shadow-black/40 backdrop-blur">
        <div className="mb-7 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-300">
            <MessageCircle className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-medium text-cyan-300">구독 관리</p>
            <h1 className="text-xl font-semibold tracking-tight text-zinc-50">
              Discord 로그인
            </h1>
          </div>
        </div>

        {errors[errorKey] ? (
          <p className="mb-4 rounded-md border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-200">
            {errors[errorKey]}
          </p>
        ) : null}

        <form action={signInWithDiscord} className="grid gap-4">
          <input type="hidden" name="next" value={next} />
          <Button className="h-11 bg-indigo-500 text-white hover:bg-indigo-400">
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            Discord로 계속하기
          </Button>
        </form>
      </section>
    </main>
  );
}
