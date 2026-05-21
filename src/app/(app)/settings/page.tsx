import { CheckCircle2, Database, KeyRound, ShieldCheck } from "lucide-react";

import { Badge, PageHeader } from "@/components/ui";
import { getCurrentUser } from "@/lib/dal";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const publicKeyName = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ? "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
    : "NEXT_PUBLIC_SUPABASE_ANON_KEY";
  const hasServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const hasDiscordWebhook = Boolean(process.env.DISCORD_WEBHOOK_URL);

  return (
    <>
      <PageHeader
        title="설정"
        description="환경변수, 보안 원칙, 알림 연동 준비 상태를 확인합니다."
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <SettingBlock
          icon={<Database className="h-5 w-5" />}
          title="Supabase"
          rows={[
            ["Project URL", supabaseUrl || "미설정"],
            ["Public key source", publicKeyName],
            ["Service role key", hasServiceRole ? "설정됨" : "미설정"],
          ]}
        />
        <SettingBlock
          icon={<ShieldCheck className="h-5 w-5" />}
          title="접근 제어"
          rows={[
            ["현재 사용자", user.email ?? user.id],
            ["ALLOWED_EMAILS", process.env.ALLOWED_EMAILS ? "사용 중" : "미사용"],
            ["RLS", "subscriptions / notification_logs 활성화"],
          ]}
        />
        <SettingBlock
          icon={<KeyRound className="h-5 w-5" />}
          title="서버 전용 값"
          rows={[
            ["SUPABASE_SERVICE_ROLE_KEY", hasServiceRole ? "설정됨" : "미설정"],
            ["DISCORD_WEBHOOK_URL", hasDiscordWebhook ? "설정됨" : "미사용"],
          ]}
        />
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <h3 className="text-sm font-semibold text-slate-950">현재 상태</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="emerald">로그인 필요</Badge>
            <Badge tone="emerald">RLS 적용</Badge>
            <Badge tone="emerald">Public key only in browser</Badge>
            <Badge tone={hasServiceRole ? "emerald" : "amber"}>
              Service role server only
            </Badge>
          </div>
        </section>
      </section>
    </>
  );
}

function SettingBlock({
  icon,
  title,
  rows,
}: {
  icon: React.ReactNode;
  title: string;
  rows: [string, string][];
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-center gap-3 text-slate-950">
        <div className="text-emerald-700">{icon}</div>
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <dl className="grid gap-3">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="grid gap-1 border-t border-slate-100 pt-3 sm:grid-cols-[180px_1fr]"
          >
            <dt className="text-sm font-medium text-slate-500">{label}</dt>
            <dd className="break-all text-sm font-semibold text-slate-900">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
