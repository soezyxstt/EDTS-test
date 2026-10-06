"use client";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { clearDemoIdentity, writeAuthenticatedIdentity } from "@/lib/demo-session";

export function SignOutButton() {
  return (
    <Button
      variant="outline"
      type="button"
      onClick={async () => {
        await authClient.signOut();
        clearDemoIdentity();
        writeAuthenticatedIdentity(null);
        const response = await fetch("/api/demo-session", { method: "DELETE" });
        if (response.ok) window.location.assign(new URL("/", window.location.origin).href);
      }}
    >
      Keluar
    </Button>
  );
}
