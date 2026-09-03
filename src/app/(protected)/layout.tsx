import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { FlashToast } from "@/components/flash-toast";
import { requireUser } from "@/lib/auth";
export default async function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireUser();
  return (
    <AppShell username={user.username} role={user.role}>
      <FlashToast />
      {children}
    </AppShell>
  );
}
