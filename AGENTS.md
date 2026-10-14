<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Git

- Work exclusively on `main` in this working tree. Before editing files or running Git write commands, verify `git branch --show-current` returns `main`. If it does not (including detached HEAD), stop and report the mismatch; do not switch automatically.
- Creating, switching, renaming, or deleting branches, checking out another commit, and creating worktrees require an explicit request for that specific action in the current user message. Requests to implement, fix, review, test, deploy, commit, or push do not authorize a branch change.
- Keep all changes on `main` and leave them uncommitted unless the current user message explicitly requests a commit. Push only when explicitly requested.
- These rules apply to every agent and override skill workflows that suggest branches or worktrees. Do not bypass them through scripts, tools, or another agent.

## Database

This is a development project. There is no backwards compatibility and the data is worthless. Prefer data loss: never backfill, migrate, or preserve existing rows, and never spend effort on keeping old data working. Every schema change means a clean slate.

- Apply schema changes only with `npm run db:push` (`drizzle-kit push`). Never generate or run migrations, or create migration artifacts.

## Forms

- Use the shadcn skill for form UI, Clerk for authentication, and Neon for database work. Reuse existing components and read the relevant skill documentation before implementation.
- Compose forms with React Hook Form, `zodResolver`, and shadcn `FieldGroup`, `Field`, `FieldLabel`, and `FieldError`. Use `Controller` for controlled inputs and `useWatch` for reactive values.
- Generate insert validation from the Drizzle table with `drizzle-zod`. Derive the client form schema by selecting editable fields; share validation between the form and server action. Infer types from Zod and define trimming and length limits in the schema.
- Keep mutations in `actions/`. Authenticate each action with `await auth.protect()`, derive `userId` from Clerk, and validate untrusted input before inserting. Ownership, IDs, timestamps, and other server-managed fields must come from trusted server values or database defaults.
- Use Base UI's `render` composition for dialog triggers and close buttons. Include a dialog title and description, associated field labels, `data-invalid` on fields, and `aria-invalid` plus linked error messages on controls. Use `ToggleGroup` for preset choices and semantic theme tokens for styling.
- Run client-triggered server actions in a transition. Disable submission and editing while pending, preserve values on failure, show actionable errors, and close/reset only on cancel or success. Confirm success with the existing toast and revalidate affected routes.
- Add a small check covering validation, authentication, ownership spoofing, and database failure. Run typecheck, lint, and build; report live database and authenticated browser checks separately from stubbed checks.

## DiceBear

Use DiceBear 10. Documentation: https://www.dicebear.com/llms.txt

There are seven native cores with identical output, not one library with
wrappers. Use the one matching this project's language. Do not reach for the
JavaScript core when the project is written in something else:

    JavaScript  @dicebear/core + @dicebear/styles
    PHP         dicebear/core + dicebear/styles
    Python      dicebear-core + dicebear-styles
    Rust        dicebear-core + dicebear-styles
    Go          github.com/dicebear/dicebear-go/v10 + github.com/dicebear/styles/v10
    Dart        dicebear_core + dicebear_styles
    C#          DiceBear.Core + DiceBear.Styles

Every style page carries a loading snippet for all seven, for example
https://www.dicebear.com/styles/lorelei/index.md

HTTP API: https://api.dicebear.com/10.x/<style>/svg?seed=<seed> The seed is a
query parameter, not a path segment. Options are query parameters too; array
values are separated by commas.

Options named after a component end in Variant: eyesVariant, not eyes. This
holds in all seven cores and in the HTTP API. Look up the options of a style at
https://api.dicebear.com/10.x/<style>/options.json

Write these forms, not the ones on the left. The left column is pre-10 and the
API does not reject it, so an outdated call runs and silently does the wrong
thing:

    avatars.dicebear.com/api/<style>/<seed>.svg  ->  api.dicebear.com/10.x/<style>/svg?seed=<seed>
    api.dicebear.com/9.x/<style>/svg             ->  api.dicebear.com/10.x/<style>/svg
    npm install @dicebear/collection             ->  npm install @dicebear/styles
    npm install @dicebear/lorelei                ->  npm install @dicebear/styles
    createAvatar(lorelei, { seed })              ->  new Avatar(new Style(definition), { seed })
    { eyes: ['variant01'] }                      ->  { eyesVariant: ['variant01'] }
    ?radius=50                                   ->  ?borderRadius=50

Only JavaScript and the HTTP API have a pre-10 form. The other six cores were
released in 2026 and never had one, so any older-looking PHP, Python, Rust, Go,
Dart or C# API attributed to DiceBear is invented rather than outdated.

<!-- TRIGGER.DEV SKILLS START -->
## Trigger.dev agent skills

This project has Trigger.dev agent skills installed in `.agents/skills/`. Before writing or changing Trigger.dev code (background tasks, scheduled tasks, realtime, or chat.agent AI agents), load the most relevant skill: `trigger-authoring-chat-agent`, `trigger-authoring-tasks`, `trigger-chat-agent-advanced`, `trigger-cost-savings`, `trigger-getting-started`, `trigger-realtime-and-frontend`.
<!-- TRIGGER.DEV SKILLS END -->
