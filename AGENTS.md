# Immersion Tracker

Frontend for tracking immersion sessions while learning a language. Uses Next.js App Router, TypeScript, Tailwind CSS, shadcn (Base UI), and Bun.

- Designs: Penpot file **Immersion tracker**, accessed through the Penpot MCP server. Consult relevant designs for UI work.
- Prefer shadcn components; build custom components only when shadcn does not support the required behavior.
- Backend: separate repository. OpenAPI is served at `<backend-url>:4000/api-json`, locally `http://localhost:4000/api-json`.
- Generate TanStack React Query hooks, models, and MSW mocks with `bun run api:generate`. Configure `OPENAPI_URL` and server-only `API_URL` in `.env.local`; see `.env.example`. The SDK uses the relative `/api/backend` proxy path. Never hand-edit `lib/api/generated`.
- Use Zod for form validation.
- Name shared infrastructure for its application-wide role, rather than the first feature using it. For example, the API proxy's endpoint allowlist is `authorizedPaths`, since it will serve multiple pages.
- Place reusable components, utilities, and types in shared locations and name them for their application-wide purpose. Scope them to a page or feature only when their behavior is specific to it. For example, duration formatters belong in `lib/duration.ts`, even when first used by the dashboard.
- Keep README documentation concise and focused on setup for new developers. Avoid code walkthroughs and explanations of implementation internals.
- For test selection, implementation, and review, use the local [testing skill](.agents/skills/testing/SKILL.md).
- For binding UI to backend data, use the local [backend integration skill](.agents/skills/backend-integration/SKILL.md).

## Post-implementation review

- After completing an implementation and its relevant checks, invoke the `implementation_reviewer` agent defined in [.codex/agents/implementation_reviewer.toml](.codex/agents/implementation_reviewer.toml) before the final handoff. Give it the user requirements, changed-file scope or diff baseline, and verification results.
- The reviewer checks correctness, reusable design and shared-code placement, accidental duplication, and whether tests protect lasting behavior users care about. It reports findings without editing the implementation.
- Address actionable findings, run the checks relevant to the fixes, and request a focused follow-up review for those findings. Resolve review findings before handoff or explicitly report any unresolved findings and verification limits. If custom agents are unavailable, perform the review using the same agent instructions and disclose that limitation.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
