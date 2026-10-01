import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth-server";

export default async function ApplicationsLayout({ children }: { children: ReactNode }) {
  await requireRole("applicant", "/applications");
  return children;
}
