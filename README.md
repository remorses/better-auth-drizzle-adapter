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

Drizzle owns the encoding for every field Better Auth types as `string[]`,
`number[]` or `json`, so those columns must be declared as json mode. This is
what `createSchema` generates:

```ts
scopes: text('scopes', { mode: 'json' }).$type<string[]>()   // sqlite, mysql
scopes: text('scopes').array()                               // pg
```

> [!NOTE]
> Before `1.2.0` `supportsJSON` was provider-based while `supportsArrays` was
> always `true`, so `json` fields on SQLite and MySQL were stringified twice and
> stored as `"{\"a\":1}"`. Better Auth read them back correctly, but
> `json_extract` and direct drizzle queries saw a string. `1.2.0` matches
> `@better-auth/drizzle-adapter/relations-v2` and stores them single-encoded.

## Peer dependencies

- `better-auth` >= 1.6.0
- `drizzle-orm` >= 1.0.0-beta.1

## License

MIT
