import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DEMO_IDENTITIES, DEMO_SESSION_COOKIE } from "@/lib/demo-session";

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function getDemoSession() {
  const id = (await cookies()).get(DEMO_SESSION_COOKIE)?.value;
  return DEMO_IDENTITIES.find((identity) => identity.id === id);
}

export async function requireRole(role: "applicant" | "franchisor", callbackURL = "/") {
  const identity = await getDemoSession();
  if (identity) {
    if (identity.role !== role) redirect("/profile");
    return null;
  }
  const session = await getSession();
  if (session) {
    if (session.user.role !== role) redirect("/profile");
    return session;
  }

  redirect(`/sign-in?callbackURL=${encodeURIComponent(callbackURL)}`);
}
