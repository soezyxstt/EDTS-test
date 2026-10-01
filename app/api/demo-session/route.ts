import { cookies } from "next/headers";
import { DEMO_IDENTITIES, DEMO_SESSION_COOKIE } from "@/lib/demo-session";

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") return Response.json({ error: "Demo access is local only." }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const identityId = (body as Record<string, unknown>).identityId;
  const identity = DEMO_IDENTITIES.find((item) => item.id === identityId);
  if (!identity) return Response.json({ error: "Unknown demo identity." }, { status: 400 });

  // ponytail: the unsigned demo cookie is accepted only in local development; shared demo access needs real auth.
  (await cookies()).set(DEMO_SESSION_COOKIE, identity.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: new URL(request.url).protocol === "https:",
    path: "/",
    maxAge: 4 * 60 * 60,
  });
  return Response.json({ ok: true });
}

export async function DELETE() {
  if (process.env.NODE_ENV !== "development") return Response.json({ error: "Demo access is local only." }, { status: 404 });
  (await cookies()).delete(DEMO_SESSION_COOKIE);
  return Response.json({ ok: true });
}
