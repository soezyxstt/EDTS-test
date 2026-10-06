"use client";

import { useEffect, useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";
import {
  clearDemoWorkspace,
  hydrateDemoWorkspace,
  readDemoApplications,
  readDemoPrograms,
  type FranchiseApplication,
  type FranchiseProgram,
} from "@/lib/demo-data";
import { clearDemoIdentity, writeAuthenticatedIdentity } from "@/lib/demo-session";

export function WorkspaceSync() {
  const { data: session, isPending } = authClient.useSession();
  const [failedUserId, setFailedUserId] = useState<string | null>(null);
  const ready = useRef(false);
  const role = useRef<"applicant" | "franchisor" | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const signedIn = Boolean(session);
  const userId = session?.user.id;
  const userName = session?.user.name;
  const userEmail = session?.user.email;
  const userRole = session?.user.role;

  useEffect(() => {
    if (isPending) return;
    clearDemoIdentity();

    let cancelled = false;
    ready.current = false;
    role.current = userRole === "applicant" || userRole === "franchisor"
      ? userRole
      : null;
    clearDemoWorkspace();

    if (!signedIn || !userId || !userName || !userEmail || !role.current) {
      writeAuthenticatedIdentity(null);
      return;
    }
    writeAuthenticatedIdentity({
      id: userId,
      name: userName,
      email: userEmail,
      role: role.current,
    });

    void (async () => {
      try {
        const response = await fetch("/api/workspace", { cache: "no-store" });
        if (!response.ok) throw new Error("Could not load workspace.");
        const workspace = await response.json() as {
          programs?: FranchiseProgram[];
          applications?: FranchiseApplication[];
        };
        if (!Array.isArray(workspace.programs) || !Array.isArray(workspace.applications)) {
          throw new Error("Invalid workspace response.");
        }
        if (cancelled) return;
        const migrated = hydrateDemoWorkspace(workspace.programs, workspace.applications);
        ready.current = true;
        setFailedUserId(null);
        if (migrated) window.dispatchEvent(new Event("franchise-prototype:update"));
      } catch {
        if (!cancelled) setFailedUserId(userId);
      }
    })();

    return () => {
      cancelled = true;
      ready.current = false;
    };
  }, [isPending, signedIn, userId, userName, userEmail, userRole]);

  useEffect(() => {
    function scheduleSave() {
      if (!ready.current || !role.current) return;
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        const currentRole = role.current;
        if (!ready.current || !currentRole) return;
        const payload = currentRole === "franchisor"
          ? { programs: readDemoPrograms(), applications: readDemoApplications() }
          : { applications: readDemoApplications() };
        try {
          const response = await fetch("/api/workspace", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!response.ok) throw new Error("Could not save workspace.");
          setFailedUserId(null);
        } catch {
          setFailedUserId(userId ?? null);
        }
      }, 200);
    }

    window.addEventListener("franchise-prototype:update", scheduleSave);
    return () => {
      window.removeEventListener("franchise-prototype:update", scheduleSave);
      clearTimeout(saveTimer.current);
    };
  }, [userId]);

  return failedUserId === userId && userId ? (
    <p className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-xl border border-border bg-background p-3 text-sm shadow-lg" role="alert">
      Workspace belum tersimpan. Muat ulang halaman untuk mencoba lagi.
    </p>
  ) : null;
}
