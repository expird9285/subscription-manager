import { Document, StandalonePage } from "../layout";
import { LinkButton } from "../ui";

export function ErrorPage({ title, message }: { title: string; message: string }) {
  return (
    <Document title={title}>
      <StandalonePage>
        <section class="w-full max-w-md rounded-lg border border-white/10 bg-zinc-950/90 p-6 text-center shadow-2xl shadow-black/40">
          <h1 class="text-xl font-semibold tracking-tight text-zinc-50">{title}</h1>
          <p class="mt-3 text-sm leading-6 text-zinc-400">{message}</p>
          <LinkButton href="/dashboard" variant="secondary" class="mt-6">
            대시보드로 이동
          </LinkButton>
        </section>
      </StandalonePage>
    </Document>
  );
}
