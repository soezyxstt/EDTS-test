import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DEMO_IDENTITIES, DEMO_SESSION_COOKIE } from "@/lib/demo-session";

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireRole(role: "applicant" | "franchisor", callbackURL = "/") {
  const session = await getSession();
  if (session) {
    if (session.user.role !== role) redirect("/profile");
    return session;
  }

  if (process.env.NODE_ENV === "development") {
    const identityId = (await cookies()).get(DEMO_SESSION_COOKIE)?.value;
    const identity = DEMO_IDENTITIES.find((item) => item.id === identityId);
    if (identity?.role === role) return null;
  }

  redirect(`/sign-in?callbackURL=${encodeURIComponent(callbackURL)}`);
}
