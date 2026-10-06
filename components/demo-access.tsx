"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DEMO_IDENTITIES, type DemoIdentityRole, writeDemoIdentity } from "@/lib/demo-session";

export function DemoAccess({ callbackURL }: { callbackURL: string }) {
  const [pendingRole, setPendingRole] = useState<DemoIdentityRole | null>(null);
  const [error, setError] = useState("");

  async function startDemo(role: DemoIdentityRole) {
    const identity = DEMO_IDENTITIES.find((item) => item.role === role);
    if (!identity) return;

    setPendingRole(role);
    setError("");
    try {
      const response = await fetch("/api/demo-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identityId: identity.id }),
      });
      if (!response.ok) throw new Error("Akses demo tidak tersedia.");

      writeDemoIdentity(identity.id);
      const requestedPathMatchesRole = role === "applicant"
        ? callbackURL.startsWith("/apply/") || callbackURL.startsWith("/applications")
        : callbackURL.startsWith("/manage");
      window.location.assign(requestedPathMatchesRole ? callbackURL : role === "franchisor" ? "/manage" : "/applications");
    } catch {
      setError("Demo tidak dapat dimulai. Coba lagi.");
      setPendingRole(null);
    }
  }

  return (
    <section className="mt-6 border-t border-border pt-5" aria-label="Akses demo">
      <div className="mb-4 text-center">
        <h3 className="text-base font-bold">Coba demo</h3>
        <p className="mt-1 text-sm leading-5 text-muted-foreground">
          Pilih alur pemohon atau franchisor untuk melihat prosesnya.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Button variant="secondary" onClick={() => void startDemo("applicant")} disabled={pendingRole !== null}>
          {pendingRole === "applicant" ? "Menyiapkan…" : "Demo pemohon"}
        </Button>
        <Button onClick={() => void startDemo("franchisor")} disabled={pendingRole !== null}>
          {pendingRole === "franchisor" ? "Menyiapkan…" : "Demo franchisor"}
        </Button>
      </div>
      {error ? <p className="mt-3 text-sm text-destructive" role="alert">{error}</p> : null}
    </section>
  );
}
