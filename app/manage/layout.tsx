import type { ReactNode } from "react";
import ManageShell from "@/components/franchisor/manage-shell";
import { requireRole } from "@/lib/auth-server";

export default async function ManageLayout({ children }: { children: ReactNode }) {
  await requireRole("franchisor", "/manage");
  return <ManageShell>{children}</ManageShell>;
}
