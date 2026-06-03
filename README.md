# better-auth-drizzle-adapter

Drizzle ORM v1 adapter for [Better Auth](https://better-auth.com) with **relations v2** support.

Vendored from [better-auth/better-auth#9489](https://github.com/better-auth/better-auth/pull/9489) until the PR is merged and released officially. Once `@better-auth/drizzle-adapter` ships with relations v2 support, this package will be deprecated.

## Install

```bash
pnpm add better-auth-drizzle-adapter
```

## Usage

```ts
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth-drizzle-adapter'
import { drizzle } from 'drizzle-orm/d1'
import * as schema from './schema'

const db = drizzle(env.DB, { schema })

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'sqlite' }),
  // ...
})
```

## Peer dependencies

- `better-auth` >= 1.6.0
- `drizzle-orm` >= 1.0.0-beta.1

## License

MIT
