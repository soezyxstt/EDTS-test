export type DemoIdentityRole = "applicant" | "franchisor";

export const DEMO_IDENTITIES = [
  { id: "nadia", name: "Nadia Putri", email: "nadia.putri@example.test", role: "applicant" },
  { id: "rizky", name: "Rizky Pratama", email: "rizky.pratama@example.test", role: "applicant" },
  { id: "dewi", name: "Dewi Anggraini", email: "dewi.anggraini@example.test", role: "applicant" },
  { id: "bima", name: "Bima Setiawan", email: "bima.setiawan@example.test", role: "applicant" },
  { id: "tim", name: "Tim", email: "tim.franchisor@example.test", role: "franchisor" },
] as const satisfies readonly { id: string; name: string; email: string; role: DemoIdentityRole }[];

export type DemoIdentity = (typeof DEMO_IDENTITIES)[number];
export type DemoIdentityId = DemoIdentity["id"];
export type WorkspaceIdentity = { id: string; name: string; email: string; role: DemoIdentityRole };

export type DemoApplicantProfile = {
  fullName: string;
  email: string;
  phone: string;
  age: string;
  residentialAddress: string;
};

export const DEMO_SESSION_EVENT = "franchise-prototype:update";
export const DEMO_SESSION_COOKIE = "franchise-prototype-demo-session-v1";

const IDENTITY_KEY = "franchise-prototype:identity:v1";
const AUTH_IDENTITY_KEY = "franchise-prototype:auth-identity:v1";
const PROFILE_PREFIX = "franchise-prototype:profile:v1:";

export function readDemoIdentity(): DemoIdentity {
  if (typeof window === "undefined") return DEMO_IDENTITIES[0];

  try {
    const storedId = window.localStorage.getItem(IDENTITY_KEY);
    return DEMO_IDENTITIES.find(({ id }) => id === storedId) ?? DEMO_IDENTITIES[0];
  } catch {
    return DEMO_IDENTITIES[0];
  }
}

export function readWorkspaceIdentity(): WorkspaceIdentity {
  if (typeof window !== "undefined" && process.env.NODE_ENV !== "development") {
    try {
      const saved = JSON.parse(window.localStorage.getItem(AUTH_IDENTITY_KEY) ?? "null") as Partial<WorkspaceIdentity> | null;
      if (saved && typeof saved.id === "string" && typeof saved.name === "string" && typeof saved.email === "string" &&
        (saved.role === "applicant" || saved.role === "franchisor")) return saved as WorkspaceIdentity;
    } catch {
      // Fall back to the demo identity until the authenticated workspace loads.
    }
  }
  return readDemoIdentity();
}

export function writeAuthenticatedIdentity(identity?: WorkspaceIdentity | null) {
  if (typeof window === "undefined") return;
  try {
    if (identity) window.localStorage.setItem(AUTH_IDENTITY_KEY, JSON.stringify(identity));
    else window.localStorage.removeItem(AUTH_IDENTITY_KEY);
  } catch {
    // Workspace authorization does not depend on this display/profile cache.
  }
  window.dispatchEvent(new Event(DEMO_SESSION_EVENT));
}

export function writeDemoIdentity(id: DemoIdentityId): DemoIdentity {
  const identity = DEMO_IDENTITIES.find((item) => item.id === id);
  if (!identity) throw new RangeError("Identitas demo tidak tersedia.");

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(IDENTITY_KEY, identity.id);
    } catch {
      // The prototype still works for this page when browser storage is unavailable.
    }
    window.dispatchEvent(new Event(DEMO_SESSION_EVENT));
  }

  return identity;
}

export function clearDemoIdentity() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(IDENTITY_KEY);
  } catch {
    // A later page load still starts without a demo session.
  }
  window.dispatchEvent(new Event(DEMO_SESSION_EVENT));
}

export function readDemoProfile(id: string, defaults?: Partial<DemoApplicantProfile>): DemoApplicantProfile {
  const identity = DEMO_IDENTITIES.find((item) => item.id === id);
  const fallback = { fullName: defaults?.fullName ?? identity?.name ?? "", email: defaults?.email ?? identity?.email ?? "", phone: "", age: "", residentialAddress: "" };
  if (typeof window === "undefined") return fallback;
  try {
    const saved = window.localStorage.getItem(`${PROFILE_PREFIX}${id}`);
    return saved ? { ...fallback, ...JSON.parse(saved) as Partial<DemoApplicantProfile> } : fallback;
  } catch {
    return fallback;
  }
}

export function writeDemoProfile(id: string, profile: DemoApplicantProfile) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${PROFILE_PREFIX}${id}`, JSON.stringify(profile));
  } catch {
    // The form remains usable when browser storage is unavailable.
  }
}
