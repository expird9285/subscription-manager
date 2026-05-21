import { CreditCard } from "lucide-react";

import { login, signup } from "@/app/actions/auth";
import { Button, inputClass } from "@/components/ui";

const errors: Record<string, string> = {
  missing: "이메일과 비밀번호를 입력하세요.",
  invalid: "로그인 정보가 올바르지 않습니다.",
  signup: "회원가입 요청에 실패했습니다.",
  confirm: "이메일 확인 링크가 만료되었거나 올바르지 않습니다.",
  not_allowed: "허용된 이메일만 사용할 수 있습니다.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const errorKey = typeof params.error === "string" ? params.error : "";
  const message = params.message === "check_email" ? "확인 이메일을 보냈습니다." : "";
  const next = typeof params.next === "string" ? params.next : "/dashboard";

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
            <CreditCard className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-medium text-emerald-700">구독 관리</p>
            <h1 className="text-xl font-semibold tracking-tight">로그인</h1>
          </div>
        </div>

        {errors[errorKey] ? (
          <p className="mb-4 rounded-md bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
            {errors[errorKey]}
          </p>
        ) : null}

        {message ? (
          <p className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
            {message}
          </p>
        ) : null}

        <form className="grid gap-4">
          <input type="hidden" name="next" value={next} />
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            이메일
            <input
              className={inputClass}
              type="email"
              name="email"
              autoComplete="email"
              required
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            비밀번호
            <input
              className={inputClass}
              type="password"
              name="password"
              autoComplete="current-password"
              minLength={6}
              required
            />
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button formAction={login}>로그인</Button>
            <Button formAction={signup} variant="secondary">
              회원가입
            </Button>
          </div>
        </form>
      </section>
    </main>
  );
}
