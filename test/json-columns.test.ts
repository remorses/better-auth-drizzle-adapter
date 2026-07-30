// `string[]`, `number[]` and `json` fields against real SQLite.
//
// Drizzle owns the encoding for these, so the schema must declare them as
// `mode: "json"` columns (which is what createSchema generates). Each case
// asserts the value read back *and* the bytes on disk: with the wrong flags
// the value round trips fine while the column holds double-encoded JSON that
// no other SQL client can read.

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as t from "drizzle-orm/sqlite-core";
import { beforeEach, expect, test } from "vitest";
import { drizzleAdapter } from "../src/index.ts";

const schema = {
	user: t.sqliteTable("user", {
		id: t.text("id").primaryKey(),
		name: t.text("name").notNull(),
		email: t.text("email").notNull().unique(),
		emailVerified: t.integer("email_verified", { mode: "boolean" }).notNull(),
		image: t.text("image"),
		createdAt: t.integer("created_at", { mode: "timestamp_ms" }).notNull(),
		updatedAt: t.integer("updated_at", { mode: "timestamp_ms" }).notNull(),
		tags: t.text("tags", { mode: "json" }).$type<string[]>(),
		counts: t.text("counts", { mode: "json" }).$type<number[]>(),
		meta: t.text("meta", { mode: "json" }),
	}),
};

const options = {
	user: {
		additionalFields: {
			tags: { type: "string[]" as const, required: false },
			counts: { type: "number[]" as const, required: false },
			meta: { type: "json" as const, required: false },
		},
	},
};

const input = {
	name: "Ada",
	email: "ada@example.com",
	emailVerified: true,
	createdAt: new Date(),
	updatedAt: new Date(),
	tags: ["openid", "profile"],
	counts: [1, 2, 3],
	meta: { plan: "pro", seats: 4 },
};

let sqlite: Database.Database;

beforeEach(() => {
	sqlite = new Database(":memory:");
	sqlite.exec(`
		create table user (
			id text primary key, name text not null, email text not null unique,
			email_verified integer not null, image text,
			created_at integer not null, updated_at integer not null,
			tags text, counts text, meta text
		)
	`);
});

function makeAdapter() {
	// `drizzle(sqlite, …)` opens its own connection in drizzle 1.x, which
	// silently gives an empty `:memory:` database. `{ client }` reuses ours.
	const db = drizzle({ client: sqlite, schema });
	return drizzleAdapter(db as any, { provider: "sqlite", schema })(
		options as any,
	);
}

test("round trips string[], number[] and json", async () => {
	const adapter = makeAdapter();
	const created: any = await adapter.create({ model: "user", data: input });
	expect(created.tags).toEqual(["openid", "profile"]);
	expect(created.counts).toEqual([1, 2, 3]);
	expect(created.meta).toEqual({ plan: "pro", seats: 4 });

	const found: any = await adapter.findOne({
		model: "user",
		where: [{ field: "email", value: "ada@example.com" }],
	});
	expect(found.tags).toEqual(["openid", "profile"]);
	expect(found.counts).toEqual([1, 2, 3]);
	expect(found.meta).toEqual({ plan: "pro", seats: 4 });
});

test("stores single-encoded JSON that SQLite itself can read", async () => {
	const adapter = makeAdapter();
	await adapter.create({ model: "user", data: input });

	// Double-encoded values make json_extract return null, which is how this
	// breaks admin panels and any query that does not go through Better Auth.
	const extracted = sqlite
		.prepare(
			`select json_extract(tags, '$[0]') tag, json_extract(meta, '$.plan') plan from user`,
		)
		.get() as any;
	expect(extracted.tag).toBe("openid");
	expect(extracted.plan).toBe("pro");
});

test("update re-encodes the same way", async () => {
	const adapter = makeAdapter();
	await adapter.create({ model: "user", data: input });

	const updated: any = await adapter.update({
		model: "user",
		where: [{ field: "email", value: "ada@example.com" }],
		update: { tags: ["offline_access"], meta: { plan: "free", seats: 1 } },
	});
	expect(updated.tags).toEqual(["offline_access"]);
	expect(updated.meta).toEqual({ plan: "free", seats: 1 });

	const raw = sqlite.prepare("select tags from user").get() as any;
	expect(JSON.parse(raw.tags)).toEqual(["offline_access"]);
});

test("leaves null alone", async () => {
	const adapter = makeAdapter();
	const created: any = await adapter.create({
		model: "user",
		data: { ...input, tags: null, counts: null, meta: null },
	});
	expect(created.tags).toBeNull();
	expect(created.meta).toBeNull();
	expect((sqlite.prepare("select tags from user").get() as any).tags).toBeNull();
});
