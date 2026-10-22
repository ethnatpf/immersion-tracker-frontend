# Immersion Tracker

Frontend for tracking immersion sessions while learning a language. Uses Next.js App Router, TypeScript, Tailwind CSS, shadcn (Base UI), and Bun.

- Designs: Penpot file **Immersion tracker**, accessed through the Penpot MCP server. Consult relevant designs for UI work.
- Prefer shadcn components; build custom components only when shadcn does not support the required behavior.
- Backend: separate repository. OpenAPI is served at `<backend-url>:4000/api-json`, locally `http://localhost:4000/api-json`.
- Generate TanStack React Query hooks, models, and MSW mocks with `bun run api:generate`. Configure `OPENAPI_URL` and `NEXT_PUBLIC_API_URL` in `.env.local`; see `.env.example`. Never hand-edit `lib/api/generated`.
- Use Zod for form validation.
- For test selection, implementation, and review, use the local [testing skill](.agents/skills/testing/SKILL.md).

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
