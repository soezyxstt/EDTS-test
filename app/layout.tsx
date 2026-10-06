import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { DemoWorkspaceSync, WorkspaceSync } from "@/components/workspace-sync";
import "./globals.css";
import { getDemoSession } from "@/lib/auth-server";
import { PageMotion } from "@/components/page-motion";

const roboto = Roboto({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-speedee" });

export const metadata: Metadata = {
  title: "Peluang Franchise | Concept Prototype",
  description: "Prototype alur pengajuan dan peninjauan peluang franchise.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const demo = await getDemoSession();
  return (
    <html lang="id" className={roboto.variable}>
      <body className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex min-w-0 flex-1 flex-col"><PageMotion>{children}</PageMotion></main>
        <SiteFooter />
        {demo ? <DemoWorkspaceSync identityId={demo.id} /> : process.env.NODE_ENV === "development" ? null : <WorkspaceSync />}
      </body>
    </html>
  );
}
