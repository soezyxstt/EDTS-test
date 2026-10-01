import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { WorkspaceSync } from "@/components/workspace-sync";
import "./globals.css";

const roboto = Roboto({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-speedee" });

export const metadata: Metadata = {
  title: "Peluang Franchise | Concept Prototype",
  description: "Prototype alur pengajuan dan peninjauan peluang franchise.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={roboto.variable}>
      <body className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex min-w-0 flex-1 flex-col">{children}</main>
        <SiteFooter />
        {process.env.NODE_ENV === "development" ? null : <WorkspaceSync />}
      </body>
    </html>
  );
}
