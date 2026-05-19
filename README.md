# Better Auth Devtools

A floating devtools panel for [Better Auth](https://better-auth.com). Inspect sessions, browse users, sign in as anyone, and manage preconfigured login links — all from a self-hosted UI.

## Status

This is a proof-of-concept. No npm packages are published yet — everything lives in this monorepo.

## Install

Once published, the package will be:

```sh
npm install @better-auth-devtools/devtools
```

Requires `better-auth` as a peer dependency.

## Setup

### 1. Add the plugin to your auth instance

```ts
// packages/auth/src/index.ts
import { betterAuthDevtools } from "@better-auth-devtools/devtools/plugin";

export function createAuth() {
  return betterAuth({
    database: drizzleAdapter(db, { provider: "pg", schema }),
    plugins: [
      betterAuthDevtools({
        loginLinks: [
          { key: "admin", label: "Admin", email: "admin@example.com", createIfMissing: true },
          { key: "user", label: "Regular User", email: "user@example.com, createIfMissing: true },
        ],
      }),
    ],
  });
}
```

### 2. Mount the devtools UI component

Only render the devtools in non-production environments:

```tsx
// apps/web/src/lib/auth-client.ts
import { createAuthClient } from "better-auth/react";
import { BetterAuthDevtools } from "@better-auth-devtools/devtools/components/better-auth-devtools";

export const authClient = createAuthClient({});

export function Devtools() {
  if (process.env.NODE_ENV === "production") return null;
  return <BetterAuthDevtools auth={authClient} />;
}
```

```tsx
// apps/web/src/app/layout.tsx (or wherever your root layout is)
import { authClient } from "@/lib/auth-client";
import { Devtools } from "@/lib/auth-client";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Devtools />
      </body>
    </html>
  );
}
```

### 3. Disable in production

Devtools are off by default in production. To force-disable:

```ts
betterAuthDevtools({ enabled: false })
```

Or set `NODE_ENV=production` on your server.

## What you get

- **Session inspector** — view the current session, user, and cookie state
- **User browser** — list, search, and paginate users; sign in as any user with one click
- **Login links** — preconfigured one-click sign-in links for test accounts
- **Config viewer** — inspect your Better Auth setup (base URL, enabled features, plugin list, tables)

Sensitive fields (passwords, tokens, secrets) are never exposed.

## Packages

- `@better-auth-devtools/devtools` — the plugin and UI components
- `@better-auth-devtools/auth` — preconfigured auth instance with devtools and database adapter