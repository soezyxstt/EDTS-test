"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { clearDemoIdentity, writeAuthenticatedIdentity } from "@/lib/demo-session";

export function SignOutButton() {
  const router = useRouter();
  return (
    <Button
      variant="outline"
      type="button"
      onClick={async () => {
        await authClient.signOut();
        clearDemoIdentity();
        writeAuthenticatedIdentity(null);
        if (process.env.NODE_ENV === "development") await fetch("/api/demo-session", { method: "DELETE" });
        router.replace("/");
        router.refresh();
      }}
    >
      Keluar
    </Button>
  );
}
