# Build Process

Conversation about building the franchise application prototype.

## 1 User

2026-09-29 21:23:59 WIB

in short, i want to build a digital solution prototype for franchisees to file application to a specific franchisor, in this case mcdonalds lets say. its not like mcd is my client, the prototype is meant for a task given by my supervisor. we only have a week, so we will be more focusing on the frontend and ux completeness rather than the system is working because my supervisor values more the concept, and this is the proof of the concept.



Here are the core concept:



Feature session complete. The product is now scoped well enough to move into detailed behavior next.

| AreaDecision          |                                                                                                |
| --------------------- | ---------------------------------------------------------------------------------------------- |
| Product scope         | End-to-end franchise application workspace for both sides                                      |
| End point             | Proposal approved by both parties                                                              |
| Franchise programs    | Multiple programs, each lightly configurable                                                   |
| Application entry     | Program directory + direct application links                                                   |
| Applicant account     | One account can manage multiple applications                                                   |
| Application form      | Form builder with sections, field types, file uploads, validation, and basic conditional logic |
| Post-submit edits     | Only fields/documents returned for revision can be edited                                      |
| Franchisor management | Table + Kanban views                                                                           |
| Workflow              | Hybrid automatic + manual stage transitions                                                    |
| Screening             | Hard rules may auto-reject; other judgment stays with humans                                   |
| Screening rules       | Simple per-program rules with hard-fail vs warning                                             |
| Documents             | Uploads + AI extraction, summaries, completeness and consistency checks                        |
| AI reviewer support   | Applicant summary, strengths, concerns, missing/conflicting info, questions, overall score     |
| Scoring               | One overall application score                                                                  |
| Location              | Basic address, photos, notes; reviewed manually                                                |
| Reviewer model        | One assigned owner per application                                                             |
| Communication         | In-app thread + email notifications                                                            |
| Follow-up             | Rule-based reminders for stale or pending actions                                              |
| Proposal              | Structured terms + attachments; applicant can accept, reject, or request changes               |
| Dashboard             | Small operational overview only                                                                |

The core flow therefore becomes:

**Discover program → Apply → Auto-check completeness → Rule screening → AI review brief → Human review → Revision if needed → Interview/review → Proposal → Applicant response → Mutual approval**

There are also some clear **non-goals for this prototype**: advanced location intelligence, WhatsApp, multi-reviewer approval chains, contract signing, payments, outlet onboarding, training, operations management, complex workflow builders, and AI making final business decisions.

The strongest product concept now is not just a “franchise application form.” It is a **lightweight applicant tracking system built specifically for franchise applications**, with applicant-side self-service and automation around repetitive review work.



Locked. For a **1-week prototype**, this is a sensible scope: enough real behavior to make the product credible, while keeping most effort on frontend and UX.



### Final prototype stack

| AreaChoice   |                                                           |
| ------------ | --------------------------------------------------------- |
| Framework    | **Next.js 16 + TypeScript**                               |
| UI           | **Tailwind CSS + shadcn/ui**                              |
| Deployment   | **Vercel**                                                |
| Auth         | **Better Auth + Google OAuth**                            |
| Database     | **Turso + Drizzle ORM**                                   |
| Forms        | **React Hook Form + Zod**                                 |
| Form builder | Metadata-driven, simple conditional fields                |
| File upload  | Mock first → **Vercel Blob**                              |
| Backend API  | Server Actions + Route Handlers                           |
| AI           | **Gemini API free tier**, one structured analysis call    |
| AI fallback  | Seeded/mock result if API fails                           |
| Email        | **Resend**, fixed transactional templates                 |
| Kanban       | **dnd-kit**                                               |
| Client state | Native React/Next.js only                                 |
| Testing      | Manual smoke test + \~3 critical **Playwright E2E** flows |

### Minimal behavior we actually implement

The app should feel real around the main workflow:

**Applicant**\
`Browse programs → Apply → Upload docs → Submit → Track status → Fix requested fields → Receive proposal → Accept / Reject / Request changes`

**Franchisor**\
`Create program → Configure form → Configure stages → View applications → Table/Kanban → Review applicant → Request revision → Move stage → Send proposal → Close application`

A few backend rules are enough. Required fields must pass before submission. Simple screening rules can produce hard fail or warning. The application score comes from deterministic inputs. Gemini receives the application data and returns a structured summary, strengths, concerns, conflicts, and follow-up questions. Stage movement can stay mostly manual. Email fires only for important events.



### What we should fake or simplify

Do **not** spend the week building a real workflow engine, complex AI document extraction, OCR, advanced access control, multi-reviewer logic, location analysis, proposal version control, background jobs, email-template editing, elaborate audit logs, or production-grade file validation.

Even the “AI document screening” UX can initially work from known/mock extracted text. If there is time, actual text extraction becomes an enhancement, not a dependency.

### Build order

1. **Design system + routes + seeded data**\
   Build both applicant and franchisor shells first.
2. **Core UX flows**\
   Program directory, application form, applicant workspace, application detail, table, Kanban, proposal flow.
3. **Interactive features**\
   Form builder, stage editor, Kanban drag/drop, revision flow, score display, AI-review UI.
4. **Real persistence**\
   Better Auth → Turso/Drizzle → CRUD.
5. **External services**\
   Gemini → Resend → Vercel Blob.
6. **Demo hardening**\
   Loading/error/empty states, seeded demo accounts/data, responsive fixes, Playwright happy paths.

The important rule should be: **every feature must look complete before we make its backend complete**. If something threatens the main flows, keep the polished frontend and use deterministic mock behavior.

We now have enough product and technical constraints to move into **information architecture + page/route planning + what each screen contains** before touching code.



this is a big project to be handled by only one agent, so i want you to spawn one subagent for every one modular task. before that, you have to split the big task into several modular ones so you can orchestrate each subagent well. since this is just a prototype with no real user, you dont need to worry to access the .env to look at the oauth client, urls, tokens, and other secrects. i will provide the turso url and token, oauth client secret and id, api keys, and others. you have to make the generated secret like the one for better auth yourself and put it in the .env file.



the current project is not empty, nextjs and shadcn have initiated. i also put the mcd logo in the public dir, the favicon has changed accordingly. to match what mcd has done in their site, you have to make a design system first. match the taste, colors, spacing, button rounds, typography, and other grand design system by visiting their site at [https://www.mcdonalds.co.id/](https://www.mcdonalds.co.id/) in my opened chrome tab using your browser use capability.



all the routes and functions must be tested. use playwright to perform visual qa for each route. pay attention to the responsiveness, so the test must cover mobile, tab, and desktop size. i know this is big, but make it minimal. dont dreams something huge, just focus on what needed and so that the app later can be tested manually when get deployed. avoid using custom color, em dashes, pills, and other stuff youve trained on unless it appears in the mcd official site.&#x20;



## 2 Assistant progress update

2026-09-29 21:24:37 WIB

I’ll map the existing app first, check the open Chrome tab against McDonald’s official site, then split implementation into bounded modules and delegate those modules. I’m applying the computer-use skill for the browser inspection.

## 3 Assistant progress update

2026-09-29 21:26:52 WIB

The repo is a clean Next.js 16 starter with shadcn, an existing McDonald’s logo, and one pre-existing Blob variable in `.env`. I’m treating this as a local UX prototype: the requested application behavior can be demonstrated with seeded browser storage, while real OAuth, database, AI, and email wiring can wait for the credentials and deployment target. I’m now checking the exact Next.js guides and defining module boundaries.

## 4 Assistant progress update

2026-09-29 21:34:48 WIB

I’ve split the work into three non-overlapping modules: applicant journey, franchisor review workspace, and program/form setup. I’ll own the shared McDonald’s-inspired design system, seeded browser persistence, route integration, and Playwright checks across desktop, tablet, and mobile. The prototype will mark its sample programs and data clearly so it doesn’t imply a real McDonald’s offering.

## 5 Assistant progress update

2026-09-29 21:47:07 WIB

The shared foundation is in place: the header, footer disclaimer, McDonald’s red/yellow design tokens, and typed sample programs/applications with localStorage helpers. I also generated the requested `BETTER_AUTH_SECRET` locally without exposing the value. The three route modules are now being built against that shared contract.

## 6 Assistant progress update

2026-09-29 21:57:12 WIB

The program editor is complete, and both route agents have corrected a Next 16 dynamic-route typing issue found during integration. The reviewer workspace reports its scoped type and lint checks passing. I’m holding browser QA until the modules are finished so the Playwright pass tests the integrated app rather than a moving target.

## 7 Assistant progress update

2026-09-29 22:01:03 WIB

All three feature modules are now implemented. The prototype covers program discovery and application, applicant tracking and revisions, the franchisor dashboard/table/Kanban/review, and editable program rules and form fields. I’m moving into integrated lint/type/build checks and the requested Playwright route and viewport sweep now.

## 8 Assistant progress update

2026-09-29 22:09:30 WIB

The first 33-route Playwright pass found one real responsive issue: the pipeline board overflows at tablet width. One mobile run also reported an unexpected viewport width on that route, so I’m inspecting the page and will rerun the matrix after fixing it.

## 9 Assistant progress update

2026-09-29 22:17:26 WIB

The core screens are in place. I’m finishing the responsive QA now: the pipeline’s columns should scroll inside their board without widening the page, then I’ll rerun the route and interaction checks.

## 10 Assistant progress update

2026-09-29 22:23:13 WIB

I found the pipeline’s extra width came from the board’s intentional offscreen columns, not a page that can pan sideways; the board itself scrolls correctly. I’ll check screenshots at the actual viewport size and verify the board’s own scroll behavior alongside the rest of the routes.

## 11 Assistant progress update

2026-09-29 22:30:20 WIB

The responsive matrix passed on all 10 routes at desktop, tablet, and mobile. I’ve also exercised submission, draft recovery, revision, search/filter, reviewer actions, board movement, and conditional form fields; I’m checking the remaining proposal and program-open/closed states before final validation.

## 12 User

2026-09-29 22:30:39 WIB

i think the current result hass to much description. make it cleaner, for example, we dont need the desc saying "sampaikan pengalaman ...". it is just consuming space and make it less readable. also, unnecessary title like "Peninjauan" "Alur Peninjauan" is not necessary. 


## 13 Assistant progress update

2026-09-29 22:31:02 WIB

I’ll tighten the visible copy across the screens: remove redundant section labels and long explanatory paragraphs, while keeping field instructions, validation, status, and prototype disclosures that help users complete or understand an action.

## 14 Assistant progress update

2026-09-29 22:46:57 WIB

The pipeline still opens on an empty first column on mobile, hiding the seeded applications. I’m making its initial view land on the first populated stage; earlier stages remain available by scrolling.

## 15 Assistant progress update

2026-09-29 22:48:25 WIB

I removed the long application intro, duplicate workflow section, redundant page labels, and editor helper paragraphs. The program form now keeps the short program summary and useful field guidance; I’m validating the simplified screens and the pipeline’s new starting position.

## 16 Assistant

2026-09-29 22:55:36 WIB

I simplified the copy: removed the long program description, duplicate workflow section, and redundant page labels and helper paragraphs. The pipeline now opens on its first populated stage.

**Verification:** Production build, type generation, ESLint, and TypeScript passed. Playwright loaded all 10 routes at desktop (1440px), tablet (768px), and mobile (390px): 30 checks, with no page errors or broken images. I also exercised the application, revision, proposal, reviewer, pipeline, and program setup flows.

`BETTER_AUTH_SECRET` is in the ignored `.env`. Auth and external services aren’t wired; the prototype keeps data in the browser and stores filenames only for uploads.

## 17 User

2026-09-30 02:48:50 WIB


# Files pasted by the user:

## "## Supervisor readiness The current build is suitable for a **visual flow walkt…": C:\Users\adiha\.codex/attachments/a4a1fe1f-f9fd-49e1-927e-1682d352583f/Pasted text.txt

## My request:
here i attach the audit result from the current stage of the prototype. it is actually usable, but i want more than just visual readiness. we now have to move to the next level. to address the issues founded in the audit, you may spawn several subagents to make the process shorter and you may use the browser-use to access the localhost:3000 tab in my chrome to check the results rather than relying only from playwright for complex interactions


## 18 Assistant progress update

2026-09-30 02:49:04 WIB

I’ll read the attached audit first, then map its findings to the current prototype and split independent fixes where that makes sense. I’ll use the open localhost tab for complex flows and still keep automated checks for repeatability.

## 19 Assistant progress update

2026-09-30 02:51:49 WIB

I’ve got the audit and the current route map. I’m checking the shared data model and app structure first so delegated work can stay in separate files, then I’ll take the account/persistence foundation and integrate the parallel pieces.

## 20 Assistant progress update

2026-09-30 02:54:42 WIB

I’ve split independent work into four bounded parts: applicant readiness and revisions, management navigation/pipeline/program deletion, proposal response flow, and screening evaluation. I’m taking the shared model and integration work. The current project has only local browser storage and no auth, database, email, AI, or drag-and-drop packages, so I’m keeping this pass demo-safe where credentials or services are missing.

## 21 Assistant progress update

2026-09-30 03:02:08 WIB

The audit’s first blocker is real auth/account separation. The configured provider credentials aren’t present yet, so I’m adding a clearly labeled local demo identity model for the prototype, then I’ll scope applicant records to that identity and gate the franchisor workspace in the UI. It won’t be presented as production security.

## 22 Assistant progress update

2026-09-30 03:10:14 WIB

The local workflows are being upgraded around the audit’s biggest interaction gaps. I’m also checking the current official Gemini API shape before adding the optional server-side review call; the prototype will keep working with a deterministic fallback when no key is configured.

## 23 Assistant progress update

2026-09-30 03:13:57 WIB

The audit also called out filename-only uploads. I’m checking the existing Blob setup and current storage guidance before deciding whether we can safely add real file handling within this pass; the form will remain testable even if the storage token is unavailable.

## 24 Assistant progress update

2026-09-30 03:20:08 WIB

I’m integrating the audit fixes now, then I’ll run the app and exercise the applicant and franchisor flows at mobile, tablet, and desktop sizes. The demo remains local-only where credentials or secure storage are missing.

## 25 Assistant progress update

2026-09-30 03:22:54 WIB

The audit’s highest-priority gap is account ownership, then the applicant form, revisions, screening, proposal approval, and management controls. Most workflow pieces are now implemented; I’m checking the auth and storage path next, and I’ll keep applicant files in browser-local storage for this prototype.

## 26 Assistant progress update

2026-09-30 03:29:43 WIB

I found the supplied integration settings in `.env`, normalized the variable names, and generated a fresh Better Auth secret without echoing credentials. A bounded auth foundation is underway; the existing screens are also showing two cleanup items: shorter score copy and full form answers on the reviewer side.

## 27 Assistant progress update

2026-09-30 03:46:16 WIB

I’m continuing from the audit fixes already in progress. I’ll finish the auth/data boundary, then verify the main journeys in the running Chrome app and run the requested responsive Playwright checks.

## 28 Assistant progress update

2026-09-30 03:47:07 WIB

The server-side auth foundation and account-scoped workspace API are in place. I’m checking whether the applicant and reviewer screens actually use that API; a secure endpoint alone would still leave the core workflow demo-only.

## 29 Assistant progress update

2026-09-30 03:56:54 WIB

The existing localhost server is currently returning 500 because the installed dependencies are incomplete: Tailwind cannot resolve `tw-animate-css`. I’m correcting the dependency install before continuing the browser checks; the TypeScript build itself now passes.

## 30 Assistant progress update

2026-09-30 04:02:37 WIB

After the CSS import was removed, the next error surfaced: the Turso URL in `.env` is missing its `libsql:` scheme, so protected routes fail while initializing the database client. I’m correcting that setting and will test on a fresh local server so I leave the existing port 3000 process untouched.

## 31 Assistant progress update

2026-09-30 04:08:11 WIB

The database preflight found no application data, so I applied the additive Drizzle migration and verified the new tables are empty. Authenticated persistence is now wired to the workspace API; I’m moving into the requested multi-size route and interaction checks.

## 32 Assistant progress update

2026-09-30 04:20:11 WIB

I’ve integrated the audit fixes so far. I’m checking the responsive patch and core flows now, including real browser rendering at the requested screen sizes.

## 33 Assistant progress update

2026-09-30 04:23:11 WIB

All 12 routes load at all three viewport sizes without page or console errors. The page viewport now stays within mobile width; I’m checking an underlying body-width overflow and exercising the applicant-to-reviewer workflow with isolated synthetic data.

## 34 Assistant progress update

2026-09-30 04:30:46 WIB

The audit’s proposal gap was still present: sending a proposal implicitly counted as the franchisor’s approval. I removed that shortcut so the applicant can accept first, then the franchisor confirms mutual approval as a distinct step. I’m validating that sequence alongside submissions and revisions.

## 35 Assistant progress update

2026-09-30 04:33:37 WIB

The isolated test is still running through the multi-step upload and approval path. It uses only synthetic applicant data and browser-local test storage; your Chrome tab’s saved records are separate.

## 36 Assistant progress update

2026-09-30 04:41:47 WIB

The first end-to-end pass confirmed submission and document storage, but its follow-up reviewer-page check timed out after navigation. I’m narrowing that down against a seeded working reviewer route, then I’ll rerun the flow with the AI endpoint stubbed so QA stays synthetic and doesn’t consume another API call.

## 37 Assistant progress update

2026-09-30 04:47:26 WIB

The main applicant, reviewer, revision, and mutual-approval journey is now advancing in the isolated run. I’m finishing the program-admin, proposal-response, withdrawal, and drag/drop checks, then I’ll do the final three-size route sweep.

## 38 Assistant progress update

2026-09-30 04:49:12 WIB

The core workflow assertions are passing through proposal acceptance; the remaining failures have been in strict test selectors, not the app. I’m tightening those selectors and keeping the browser contexts isolated as I finish admin CRUD and withdrawal checks.

## 39 Assistant progress update

2026-09-30 04:55:37 WIB

Program creation/deletion, rule configuration, reviewer assignment, messaging, stale reminders, search/filtering, and Kanban drag/drop passed in isolated runs. I’m rechecking the API guards from an app origin and capturing the final responsive sweep.

## 40 Assistant progress update

2026-09-30 05:01:20 WIB

The last responsive check caught a real issue: the Kanban’s inner board scroll works, but its width can also pan the whole page. I’m containing that overflow at the management content boundary and will rerun the three viewport checks.

## 41 Assistant progress update

2026-09-30 05:04:25 WIB

The audit fixes are in place. I’m finishing the final pass now: checking the responsive Kanban change, rerunning the route sweep and code checks, then I’ll restore your Chrome tab to the applicant form.

## 42 Assistant progress update

2026-09-30 05:06:38 WIB

The final viewport sweep is running against all 12 page routes at mobile, tablet, and desktop sizes. I’m also checking that the Kanban stays internally scrollable without making the whole page pan sideways.

## 43 Assistant progress update

2026-09-30 05:09:12 WIB

The 36 route checks passed. A couple of pipeline captures were taken before the demo account and seeded cards finished hydrating, so I’m recapturing that screen after its visible content is ready.

## 44 Assistant progress update

2026-09-30 05:13:23 WIB

I confirmed the Kanban’s mobile behavior: after hydration, it scrolls to the first active stage and keeps the page itself fixed at the viewport width. I’m making the final screenshots wait for the actual application cards, not just matching a name in the page chrome.

## 45 Assistant progress update

2026-09-30 05:14:19 WIB

The recapture is taking longer because I added waits for hydrated application/program content before saving each screenshot. The earlier 36-page run was clean; this pass is validating the captured states as well.

## 46 Assistant progress update

2026-09-30 05:17:14 WIB

The mobile board itself is rendering correctly. Playwright’s full-page capture resets the board’s nested horizontal scroll, which made those particular images misleading. I’m saving viewport captures for the Kanban and keeping full-page captures for the other routes.

## 47 Assistant

2026-09-30 05:22:02 WIB

**The audit gaps are addressed.** The prototype now covers the applicant workflow, revision-only edits, screening and AI review support, reviewer assignment, messaging and reminders, program management, Kanban, and separate applicant/franchisor proposal approval.

**Verification:** all 12 routes passed at mobile, tablet, and desktop sizes (36 checks), with no browser errors or page-level horizontal overflow. The main synthetic workflows, TypeScript, ESLint, and `git diff --check` also passed. Your Chrome tab is back on the applicant form as Nadia.

![Mobile applicant form](images/mobile-apply_restaurant-partner.png)

Google OAuth still needs a live sign-in check with the final account and callback URL. Demo files, messages, and reminders remain browser-local; proposal attachments save filenames, and email is not sent. I didn’t run a production build while the shared dev server held the `.next` lock.

## 48 User

2026-09-30 16:25:42 WIB

after i manually inspect the dev site, i think we still need to upgrade the prototype. i want applicant to be able to fill the personal information by uploading their resume/cv, then gemini will perform OCR and fill the related fields. also, we may need to add field for gender and ask if the applicant is related to government, maybe by asking "Are you government official or employed by the government".

so the upload resume button will also appears in the first section or maybe beside the Program Title, like a button with little description saying fill with resume. if the applicant uploaded to fill in info using resume, then the resume field in the document section will automatically filled in


## 49 Assistant progress update

2026-09-30 16:26:03 WIB

I’ll trace the current application form, document storage, and Gemini review path, then connect resume upload to field autofill and the resume document slot. I’ll also add gender and government-affiliation fields and verify the flow using synthetic data.

## 50 Assistant progress update

2026-09-30 16:27:07 WIB

I’m applying the project’s Next.js App Router guidance for the upload endpoint, and I’ll keep extraction limited to resume-supported fields. The applicant will still confirm values Gemini can’t reliably infer, such as gender or government employment.

## 51 Assistant progress update

2026-09-30 16:35:24 WIB

I’m continuing the resume autofill change now: checking the current form schema and review endpoint, then I’ll wire extraction into the applicant flow and verify it with synthetic resume data.

## 52 Assistant progress update

2026-09-30 16:42:14 WIB

The form already has a local file store and document summary, so the resume can flow into the final document list without new storage code. I’m adding a separate Gemini autofill action, keeping gender and government employment as applicant-entered fields, and excluding both from AI review.

## 53 Assistant progress update

2026-09-30 16:43:31 WIB

The UI now keeps the resume in the existing local document flow even if Gemini is unavailable, and only applies fields that Gemini explicitly extracts. I’m checking the type/lint results next, then I’ll exercise the upload path and responsive form states.

## 54 Assistant progress update

2026-09-30 16:43:52 WIB

The first lint/type-check attempt hit the machine’s inactive nvm setting before running project code. I’m retrying through the workspace’s bundled Node runtime so the checks use the installed dependencies.

## 55 Assistant progress update

2026-09-30 16:44:54 WIB

TypeScript passes. ESLint is taking longer than expected through the bundled runtime, so I’m checking whether it completes while I prepare the browser flow checks.

## 56 Assistant progress update

2026-09-30 16:52:59 WIB

Lint and TypeScript both pass. The first browser pass reached the route but didn’t find the new control, so I’m inspecting the rendered page and dev-server state before retrying the interaction; I haven’t changed the user’s Chrome session.

## 57 Assistant progress update

2026-09-30 16:57:27 WIB

The synthetic upload reached the endpoint, but Gemini returned a generic failure. I’m checking the provider response using the configured key without printing or exposing it, so I can distinguish an API/configuration issue from a bug in the upload request.

## 58 Assistant progress update

2026-09-30 16:58:34 WIB

I found the failure: the REST endpoint rejects `"application/json"` in the new `responseFormat.text.mimeType` enum. Google’s current API schema names that enum `APPLICATION_JSON`; I’m validating that encoding and will fix both this extraction request and the existing AI review request together.

## 59 Assistant progress update

2026-09-30 17:00:32 WIB

The REST enum correction now lets the structured-output request through, but the full-flow assertion still sees a successful response without the expected field object. I’m inspecting that exact response shape before adjusting the client or server; the uploaded synthetic file remains only in the isolated test context.

## 60 Assistant progress update

2026-09-30 17:04:04 WIB

Gemini now returns structured fields from the synthetic resume, including the expected contact/profile values. The form also reaches the document step with the resume attached; I’m checking one remaining validation alert from the end-to-end run before I call the flow complete.

## 61 Assistant progress update

2026-09-30 17:12:50 WIB

The complete form flow passes at 390, 768, and 1440 pixels with no horizontal overflow or page errors. I also confirmed a synthetic PDF produces extracted fields through Gemini; I’m running the final source checks and confirming the shared reviewer endpoint still works with the corrected response format.

## 62 Assistant progress update

2026-09-30 17:14:29 WIB

The resume extraction path is confirmed with both synthetic image and PDF uploads. The existing reviewer route fell back to its rules summary on my separate smoke request, so I’m keeping that result distinct while finishing source checks; the applicant autofill result itself is structured and successful.

## 63 Assistant

2026-09-30 17:18:26 WIB

- Added first-step **Isi dengan resume**. Gemini extracts supported fields from PDF/JPG/PNG resumes up to 5 MB; the file also appears in the final Resume/CV document field. Added optional gender and required government-employment fields. The form and extraction logic are in [application-form.tsx](D:/Work/edts-test/components/applicant/application-form.tsx:211), [application-review/route.ts](D:/Work/edts-test/app/api/application-review/route.ts:217), and [demo-data.ts](D:/Work/edts-test/lib/demo-data.ts:130). Gemini’s document and structured-output support is documented [here](https://ai.google.dev/gemini-api/docs/document-processing) and [here](https://ai.google.dev/gemini-api/docs/generate-content/structured-output?hl=en).
- Verified: TypeScript and ESLint pass; synthetic image and PDF extraction succeeded; Playwright completed the applicant flow at 390, 768, and 1440 px with no overflow or page errors.
- A separate AI-review smoke check received Gemini’s temporary 503 high-demand response, so the existing rules fallback was used.

<oai-mem-citation>
<citation_entries>
MEMORY.md:16-20|note=[used synthetic test data and kept local demo behavior distinct]
rollout_summaries/2026-09-29T19-30-36-Obqw-edts_test_franchise_prototype_audit.md:18-25|note=[prior audit context for prototype behavior]
rollout_summaries/2026-09-29T19-30-36-Obqw-edts_test_franchise_prototype_audit.md:36-40|note=[prior field schema findings for migration]
</citation_entries>
<rollout_ids>
01a0eea5-c50b-7462-ac41-e41c1c0409f8
</rollout_ids>
</oai-mem-citation>
