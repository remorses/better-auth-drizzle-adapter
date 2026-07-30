# better-auth-drizzle-adapter

Drizzle ORM v1 adapter for [Better Auth](https://better-auth.com) with **relations v2** support.

Vendored from [better-auth/better-auth#9489](https://github.com/better-auth/better-auth/pull/9489).

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

## Array and JSON columns

Better Auth types some fields as `string[]`, `number[]` or `json`. On SQLite and
MySQL the adapter inspects the drizzle column and encodes accordingly, so both
of these work and both store **single-encoded** JSON:

```ts
scopes: text('scopes', { mode: 'json' }).$type<string[]>()  // drizzle encodes
scopes: text('scopes')                                      // the adapter encodes
```

Json-mode columns are the recommended shape and what `createSchema` generates.
On Postgres nothing is transformed, since `jsonb()` and native `.array()`
columns accept JS values directly.

> [!NOTE]
> Before `1.2.0` the adapter assumed every such column was json mode. A plain
> `text()` column then sent a raw JS array to the driver, which surfaces as
> `D1_TYPE_ERROR` on Cloudflare D1 or `Too many parameter values were provided`
> on better-sqlite3, and reads came back as strings. In the same release, `json`
> fields on json-mode columns stopped being double-encoded; existing rows decode
> to a string instead of an object, so parse defensively if you wrote any.

## Peer dependencies

- `better-auth` >= 1.6.0
- `drizzle-orm` >= 1.0.0-beta.1

## License

MIT
