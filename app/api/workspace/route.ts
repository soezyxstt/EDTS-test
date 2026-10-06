import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { application, program } from "@/lib/db-schema";
import { getDemoSession, getSession } from "@/lib/auth-server";

const MAX_BYTES = 1_048_576;
const MAX_ROWS = 500;
const stages = new Set(["submitted", "screening", "review", "revision", "interview", "proposal", "approved", "rejected"]);

class RequestError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function stringValue(value: unknown, name: string, max = 160) {
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    throw new RequestError(400, `Invalid ${name}.`);
  }
  return value;
}

function jsonObject(value: unknown, name: string) {
  if (!isRecord(value)) throw new RequestError(400, `Invalid ${name}.`);
  return value;
}

async function readBody(request: Request) {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BYTES) throw new RequestError(413, "Payload is too large.");
  if (!request.body) throw new RequestError(400, "A JSON body is required.");

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > MAX_BYTES) {
      await reader.cancel();
      throw new RequestError(413, "Payload is too large.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder().decode(bytes)) as unknown; }
  catch { throw new RequestError(400, "Body must be valid JSON."); }
}

async function authorizedSession() {
  if (await getDemoSession()) throw new RequestError(401, "Demo data stays in this browser.");
  const session = await getSession();
  if (!session) throw new RequestError(401, "Sign in required.");
  const role = session.user.role;
  if (role !== "applicant" && role !== "franchisor") throw new RequestError(403, "Role is not allowed.");
  return { userId: session.user.id, role };
}

async function workspace(userId: string, role: "applicant" | "franchisor") {
  const programs = role === "franchisor"
    ? await db.select().from(program).where(eq(program.ownerId, userId))
    : await db.select().from(program);
  const applications = role === "applicant"
    ? (await db.select().from(application).where(eq(application.applicantId, userId)))
    : (await db.select({ application }).from(application)
      .innerJoin(program, eq(application.programId, program.id))
      .where(eq(program.ownerId, userId))).map((row) => row.application);

  return {
    programs: programs
      .filter((row) => role === "franchisor" || row.payload.open === true)
      .map((row) => ({ ...row.payload, id: row.id, name: row.name })),
    applications: applications.map((row) => ({ ...row.payload, id: row.id, programId: row.programId, stage: row.stage })),
  };
}

export async function GET() {
  try {
    const { userId, role } = await authorizedSession();
    return Response.json(await workspace(userId, role));
  } catch (error) {
    if (error instanceof RequestError) return Response.json({ error: error.message }, { status: error.status });
    return Response.json({ error: "Could not load workspace." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { userId, role } = await authorizedSession();
    const body = jsonObject(await readBody(request), "workspace");
    const submittedPrograms = body.programs;
    const submittedApplications = body.applications;
    if (submittedPrograms !== undefined && (!Array.isArray(submittedPrograms) || submittedPrograms.length > MAX_ROWS)) {
      throw new RequestError(400, "Invalid programs list.");
    }
    if (submittedApplications !== undefined && (!Array.isArray(submittedApplications) || submittedApplications.length > MAX_ROWS)) {
      throw new RequestError(400, "Invalid applications list.");
    }
    if (submittedPrograms !== undefined && role !== "franchisor") throw new RequestError(403, "Applicants cannot manage programs.");
    if (submittedPrograms === undefined && submittedApplications === undefined) throw new RequestError(400, "No workspace records provided.");

    const now = new Date();
    await db.transaction(async (tx) => {
      for (const value of submittedPrograms ?? []) {
        const payload = jsonObject(value, "program");
        const id = stringValue(payload.id, "program id");
        const name = stringValue(payload.name, "program name");
        const existing = await tx.select({ ownerId: program.ownerId }).from(program).where(eq(program.id, id)).get();
        if (existing && existing.ownerId !== userId) throw new RequestError(403, "Program belongs to another account.");
        if (existing) {
          await tx.update(program).set({ name, payload, updatedAt: now }).where(and(eq(program.id, id), eq(program.ownerId, userId)));
        } else {
          await tx.insert(program).values({ id, ownerId: userId, name, payload, createdAt: now, updatedAt: now });
        }
      }

      for (const value of submittedApplications ?? []) {
        const payload = jsonObject(value, "application");
        const id = stringValue(payload.id, "application id");
        const programId = stringValue(payload.programId, "program id");
        const stage = stringValue(payload.stage, "application stage");
        if (!stages.has(stage)) throw new RequestError(400, "Invalid application stage.");
        const existing = await tx.select().from(application).where(eq(application.id, id)).get();
        const programRow = await tx.select().from(program).where(eq(program.id, programId)).get();
        if (!programRow) throw new RequestError(400, "Program does not exist.");
        if (existing) {
          if (existing.programId !== programId) throw new RequestError(403, "An application cannot be moved to another program.");
          if (role === "applicant" && existing.applicantId !== userId) throw new RequestError(403, "Application belongs to another account.");
          if (role === "franchisor" && programRow.ownerId !== userId) throw new RequestError(403, "Application is outside this account's programs.");
          await tx.update(application).set({ payload, stage, updatedAt: now }).where(eq(application.id, id));
        } else {
          if (role !== "applicant") throw new RequestError(403, "Franchisors cannot create applications for applicants.");
          if (programRow.payload.open !== true) throw new RequestError(400, "This program is not accepting applications.");
          await tx.insert(application).values({ id, programId, applicantId: userId, stage, payload, createdAt: now, updatedAt: now });
        }
      }
    });

    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof RequestError) return Response.json({ error: error.message }, { status: error.status });
    return Response.json({ error: "Could not save workspace." }, { status: 500 });
  }
}
