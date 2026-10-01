# Peluang Franchise

An Indonesian concept prototype for franchise opportunity applications and franchisor review. Applicants can find example programs, complete a configurable application, and follow its progress. Franchisors can configure programs, screen and review applications, request revisions, and prepare proposals.

The prototype is informed by the publicly visible McDonald's corporate franchising form. It is not an official McDonald's product and does not describe McDonald's internal review process.

## What the project does

### Applicant flow

- Browse open programs, currently including restaurant partnership and strategic location examples.
- Complete a multi-step form whose fields and screening rules come from the selected program.
- Save an unfinished draft in the browser, attach supporting files, and submit an application.
- View status, respond to requested revisions, and review or respond to a proposal.
- Use optional resume extraction and AI review when Gemini is configured. Applicants can review extracted content before submission. AI review is a support tool, not a final eligibility decision.

### Franchisor flow

- Create and edit programs, application fields, and deterministic screening rules.
- Review applications in a searchable list or pipeline and update their stage.
- Request specific fields or documents for revision.
- Review screening and optional AI summaries, prepare a structured proposal, and record applicant responses.
- View messages and follow-up reminders for an application.

The example programs, questions, investment ranges, and rules are prototype content. Business owners must approve them before real applications are accepted. A configured hard-fail screening rule currently moves an application to `rejected` automatically.

## Data, integrations, and limits

- **Authentication:** Better Auth with Google OAuth. New accounts are applicants by default. Set `FRANCHISOR_EMAIL` to assign the matching email the franchisor role.
- **Development demo:** The sign-in page offers applicant and franchisor demo access only when `NODE_ENV` is `development`.
- **Workspace records:** Outside development, authenticated programs and applications load and save through `/api/workspace` to the configured Turso/libSQL database. In development, sample records and workspace edits use browser storage.
- **Drafts and files:** In-progress form drafts use `localStorage`. Uploaded files are stored in the browser's IndexedDB, so they are not shared across devices or stored with the database workspace.
- **Messages and reminders:** These use browser `localStorage`. The reminder control records a reminder locally; it does not send email.
- **Gemini:** `/api/application-review` supports resume extraction and optional application review. Resume extraction sends the selected resume to Gemini when configured. Optional review can send applicant answers and selected business or financial documents after the applicant grants AI review permission. The resume extraction flow has no separate consent step in the current code.
- **Location review:** A map point and AI location summary are not verified market research. Confirm site suitability independently.
- **Deployment:** Production hosting, OAuth configuration, database access, and Gemini credentials depend on the deployment environment and have not been verified by this repository documentation.

## Run locally

Use Node.js and npm. From the repository root:

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). For Google sign-in or database-backed workspaces, configure the environment variables below in a local environment file. Local demo access is available in development.

### Environment variables

| Variable | Purpose |
| --- | --- |
| `BETTER_AUTH_SECRET` | Better Auth session signing secret. |
| `BETTER_AUTH_URL` | Base URL used by Better Auth, such as `http://localhost:3000` for local development. |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID. |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret. |
| `FRANCHISOR_EMAIL` | Optional email assigned the franchisor role. Other accounts default to applicant. |
| `TURSO_CONNECTION_URL` | libSQL or Turso database URL for workspace records and migrations. |
| `TURSO_AUTH_TOKEN` | Database token for the configured Turso database. |
| `GEMINI_API_KEY` | Enables resume extraction and AI review. |
| `GEMINI_MODEL` | Optional Gemini model override. The code defaults to `gemini-3.8-flash`. |

Keep real credentials in an ignored local environment file. Do not commit credentials.

### Database

The Drizzle schema is in `lib/db-schema.ts`; checked-in migrations are in `drizzle/`.

```bash
npm run db:generate
npm run db:migrate
```

`db:generate` creates a migration from schema changes. `db:migrate` applies pending migrations to the database configured by `TURSO_CONNECTION_URL` and `TURSO_AUTH_TOKEN`. Check that those values point to the intended database before applying migrations.

### Available commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local development server. |
| `npm run build` | Create a production build. |
| `npm run start` | Serve the production build. |
| `npm run lint` | Run ESLint. |
| `npm run db:generate` | Generate a Drizzle migration. |
| `npm run db:migrate` | Apply pending Drizzle migrations. |

## Project index

```text
app/
  page.tsx                         Public program directory
  apply/[programId]/page.tsx       Application form for a program
  applications/                    Applicant list and application detail routes
  manage/                           Franchisor overview, pipeline, applications, and programs
  sign-in/                          Google sign-in and development demo access
  profile/                          Signed-in account details
  api/
    auth/[...all]/route.ts          Better Auth handler
    workspace/route.ts              Role-checked program and application load/save
    application-review/route.ts     Resume extraction and application review endpoint
    demo-session/route.ts            Development-only demo session endpoint

components/
  applicant/                       Program directory, application form, list, detail, and location picker
  franchisor/                       Dashboard, review, pipeline, proposal editor, and application list
  program-admin/                    Program editor and program list
  auth/                             Sign-in and sign-out controls
  ui/                               Shared input, select, textarea, and button components
  communication-panel.tsx           Browser-local messages and reminder log
  workspace-sync.tsx                 Syncs signed-in workspace records outside development

lib/
  auth.ts, auth-server.ts, auth-client.ts   Authentication and role helpers
  db.ts, db-schema.ts                       libSQL connection and Drizzle tables
  demo-data.ts, demo-session.ts              Example programs, applications, and local identity
  demo-files.ts                              Browser IndexedDB file storage
  demo-communication.ts                      Browser-local messages and reminder records
  screening.ts                                Deterministic rule evaluation and scoring
  location.ts                                 Map point parsing and map links

drizzle/                          SQL migrations and migration metadata
public/images/                    Prototype imagery
public/logo.png                   Prototype logo asset
public/Software Specification Template.docx   Starting SRS template
artifacts/                        Software specification and conversation exports
  Doc_Spec.md                     Visible chat transcript from this specification session
  Doc_Spec.docx                   Word copy of the transcript
  images/                          Project screenshot and supplied PNG attachments
    mobile-apply_restaurant-partner.png
    codex-clipboard-*.png
    image-1.png, image-2.png

AGENTS.md                         Repository instructions for coding agents
CLAUDE.md                         Project notes
package.json                      Dependencies and npm scripts
drizzle.config.ts                 Drizzle migration connection configuration
next.config.ts                    Next.js configuration
components.json                   UI component generator configuration
```

The user-facing interface is Indonesian. Shared styling is in `app/globals.css`; the root layout and page metadata are in `app/layout.tsx`.
