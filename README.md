# Next.js template

This is a Next.js template with shadcn/ui.

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
