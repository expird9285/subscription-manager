import { AppShell } from "@/components/app-shell";
import { getCurrentUser } from "@/lib/dal";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return <AppShell user={user}>{children}</AppShell>;
}
