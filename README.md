# Next.js template

This is a Next.js template with shadcn/ui.

## Environment variables

For a fresh clone, copy `.env.example` to `.env.local` and fill in the Clerk
development keys. Keep an existing `.env.local`; it already contains local keys.
Only `.env.example` is tracked; real environment files are ignored by Git.

To download development variables from Vercel, first log in and link this checkout
to the intended project, then run:

```bash
npx vercel@latest env pull .env.local --environment=development
```

Back up `.env.local` before pulling: values with matching names may change.
Configure deployed secrets in Vercel's project environment settings, scoped to
Development, Preview, or Production as appropriate. Use Clerk production keys
for Production. See the [Vercel environment CLI docs](https://vercel.com/docs/cli/env).

## Authentication

Clerk provides sign-in, sign-up, account management, and sign-out. The home page
is public; `/dashboard` requires a session through `await auth.protect()`.
Protect future pages, Route Handlers, and Server Actions individually before accessing private data.

The Clerk CLI provisioned temporary development keys in the ignored `.env.local`.
Do not commit or expose `CLERK_SECRET_KEY`. To claim the development application:

```bash
npx -y clerk@latest auth login
```

Run `npm run dev`, then sign up at `/sign-up` and open `/dashboard`.
Use the profile menu to sign out. With the server running, check signed-out access:

```bash
node scripts/check-auth.mjs
```

Before production, claim the application and configure production keys using
`npx -y clerk@latest deploy`. Temporary development keys are not production-ready.

## Adding components

To add components to your app, run the following command:

```bash
npx shadcn@latest add button
```

This will place the ui components in the `components` directory.

## Using components

To use the components in your app, import them as follows:

```tsx
import { Button } from "@/components/ui/button";
```
