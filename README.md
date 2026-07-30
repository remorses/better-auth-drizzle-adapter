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

### Upgrading to 1.2.0

`string[]` and `number[]` are **unchanged**: `supportsArrays` was already `true`,
so the stored bytes and the values you read back are identical. Nothing to do.

Only `json` fields changed. Before `1.2.0`, `supportsJSON` was provider-based, so
on SQLite and MySQL Better Auth stringified them and the json-mode column
stringified them again, storing `"{\"a\":1}"`. Better Auth read that back
correctly, so the bug was invisible unless you queried the column directly.

Rows written before `1.2.0` now decode to a **string** instead of an object. One
idempotent statement unwraps them, skipping NULLs and rows that are already
correct:

```sql
-- SQLite
UPDATE oauth_client
SET metadata = json_extract(metadata, '$')
WHERE metadata IS NOT NULL AND json_type(metadata) = 'text';

-- MySQL
UPDATE oauth_client
SET metadata = JSON_UNQUOTE(metadata)
WHERE metadata IS NOT NULL AND JSON_TYPE(metadata) = 'STRING';
```

Better Auth core (`user`, `session`, `account`, `verification`) has **no** `json`
fields, so a plugin-free install has nothing to migrate. Run the statement once
per `json` column your plugins declare; with `oauthProvider` that is only
`oauth_client.metadata`.

## Peer dependencies

- `better-auth` >= 1.6.0
- `drizzle-orm` >= 1.0.0-beta.1

## License

MIT
