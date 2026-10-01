"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const navigation = [
  { href: "/manage", label: "Ringkasan" },
  { href: "/manage/applications", label: "Aplikasi" },
  { href: "/manage/pipeline", label: "Pipeline" },
  { href: "/manage/programs", label: "Program" },
];

export default function ManageShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-w-0 flex-1 flex-col md:flex-row">
      <aside className="shrink-0 border-b border-[var(--line)] bg-[var(--surface-muted)] md:w-56 md:border-b-0 md:border-r">
        <nav aria-label="Navigasi pengelolaan" className="overflow-x-auto px-3 py-3 md:overflow-visible md:px-3 md:py-5">
          <ul className="m-0 flex min-w-max list-none gap-1 p-0 md:min-w-0 md:flex-col">
            {navigation.map((item) => {
              const active = pathname === item.href || (item.href !== "/manage" && pathname.startsWith(`${item.href}/`));
              return (
                <li key={item.href}>
                  <Link
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-10 items-center border-b-2 px-3 text-sm font-semibold no-underline transition-colors md:w-full md:border-b-0 md:border-l-2 ${
                      active
                        ? "border-[var(--mcd-red)] bg-white text-[var(--mcd-red)] md:font-bold"
                        : "border-transparent text-[var(--ink)] hover:bg-white hover:text-[var(--mcd-red)]"
                    }`}
                    href={item.href}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
