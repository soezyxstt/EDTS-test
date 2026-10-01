"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

function GoogleMark() {
  return (
    <svg aria-hidden="true" className="size-5 shrink-0" viewBox="0 0 24 24" focusable="false">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.09-1.92 3.28-4.74 3.28-8.09Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.15v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 13.04a6.6 6.6 0 0 1 0-4.08V6.12H2.15a11 11 0 0 0 0 9.76l3.69-2.84Z" />
      <path fill="#EA4335" d="M12 4.36c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45.99 14.97 0 12 0 7.73 0 4.03 2.45 2.15 6.12l3.69 2.84c.88-2.6 3.3-4.6 6.16-4.6Z" />
    </svg>
  );
}

export function SignInButton({ callbackURL }: { callbackURL: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function signIn() {
    setPending(true);
    setError("");
    try {
      const result = await authClient.signIn.social({ provider: "google", callbackURL });
      if (result.error) throw new Error("Sign-in failed.");
    } catch {
      setError("Tidak dapat masuk. Coba lagi.");
      setPending(false);
    }
  }

  return (
    <div>
      <Button className="w-full justify-center bg-white hover:bg-[#fff8e8]" variant="outline" onClick={signIn} disabled={pending}>
        <GoogleMark />
        {pending ? "Mengarahkan…" : "Masuk dengan Google"}
      </Button>
      {error ? <p className="mt-3 text-sm text-[var(--mcd-red)]" role="alert">{error}</p> : null}
    </div>
  );
}
