import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { db } from "@/lib/db";
import { account, session, user, verification } from "@/lib/db-schema";
import { authURLs } from "@/lib/auth-config";

const secret = process.env.BETTER_AUTH_SECRET;
const baseURL = process.env.BETTER_AUTH_URL;
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!secret || !baseURL || !googleClientId || !googleClientSecret) {
  throw new Error("Configure BETTER_AUTH_SECRET, BETTER_AUTH_URL, GOOGLE_CLIENT_ID, and GOOGLE_CLIENT_SECRET.");
}

const franchisorEmail = process.env.FRANCHISOR_EMAIL?.trim().toLowerCase();

export const auth = betterAuth({
  secret,
  ...authURLs(baseURL, process.env.NODE_ENV === "production"),
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: { user, session, account, verification },
  }),
  socialProviders: {
    google: { clientId: googleClientId, clientSecret: googleClientSecret },
  },
  user: {
    additionalFields: {
      role: {
        type: ["applicant", "franchisor"],
        required: false,
        defaultValue: "applicant",
        input: false,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (newUser) => ({
          data: {
            ...newUser,
            role: franchisorEmail && newUser.email.toLowerCase() === franchisorEmail ? "franchisor" : "applicant",
          },
        }),
      },
    },
  },
});
