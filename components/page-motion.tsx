"use client";

import { usePathname } from "next/navigation";

export function PageMotion({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return <div key={pathname} className="page-motion flex min-w-0 flex-1 flex-col">{children}</div>;
}
