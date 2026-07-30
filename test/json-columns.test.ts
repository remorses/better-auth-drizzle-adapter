// Round trips for the field types Better Auth encodes as JSON, against real
// SQLite. Each case asserts the value read back *and* the bytes on disk: a
// schema can round trip perfectly while storing double-encoded JSON that no
// other SQL client can read.

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as t from "drizzle-orm/sqlite-core";
import { beforeEach, describe, expect, test } from "vitest";
import { drizzleAdapter } from "../src/index.ts";

const baseColumns = {
	id: t.text("id").primaryKey(),
	name: t.text("name").notNull(),
	email: t.text("email").notNull().unique(),
	emailVerified: t.integer("email_verified", { mode: "boolean" }).notNull(),
	image: t.text("image"),
	createdAt: t.integer("created_at", { mode: "timestamp_ms" }).notNull(),
	updatedAt: t.integer("updated_at", { mode: "timestamp_ms" }).notNull(),
};

const input = {
	name: "Ada",
	email: "ada@example.com",
	emailVerified: true,
	createdAt: new Date(),
	updatedAt: new Date(),
	tags: ["openid", "profile"],
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
			tags text, meta text
		)
	`);
});

function makeAdapter(schema: Record<string, any>, options: any) {
	// `drizzle(sqlite, …)` opens its own connection in drizzle 1.x, which
	// silently gives an empty `:memory:` database. `{ client }` reuses ours.
	const db = drizzle({ client: sqlite, schema });
	return drizzleAdapter(db as any, { provider: "sqlite", schema })(options);
}

const options = {
	user: {
		additionalFields: {
			tags: { type: "string[]" as const, required: false },
			meta: { type: "json" as const, required: false },
		},
	},
};

// The shape createSchema generates, and the shape a hand-written schema
// naturally ends up with. Both have to work.
describe.each([
	[
		"json mode columns",
		{ tags: t.text("tags", { mode: "json" }), meta: t.text("meta", { mode: "json" }) },
	],
	["plain text columns", { tags: t.text("tags"), meta: t.text("meta") }],
])("%s", (_label, columns) => {
	const schema = {
		user: t.sqliteTable("user", { ...baseColumns, ...(columns as any) }),
	};

	test("round trips string[] and json", async () => {
		const adapter = makeAdapter(schema, options);
		const created: any = await adapter.create({ model: "user", data: input });
		expect(created.tags).toEqual(["openid", "profile"]);
		expect(created.meta).toEqual({ plan: "pro", seats: 4 });

		const found: any = await adapter.findOne({
			model: "user",
			where: [{ field: "email", value: "ada@example.com" }],
		});
		expect(found.tags).toEqual(["openid", "profile"]);
		expect(found.meta).toEqual({ plan: "pro", seats: 4 });
	});

	test("stores single-encoded JSON on disk", async () => {
		const adapter = makeAdapter(schema, options);
		await adapter.create({ model: "user", data: input });

		// Double-encoded would parse to a string instead of an array/object.
		const row = sqlite.prepare("select tags, meta from user").get() as any;
		expect(JSON.parse(row.tags)).toEqual(["openid", "profile"]);
		expect(JSON.parse(row.meta)).toEqual({ plan: "pro", seats: 4 });
	});

	test("leaves null alone", async () => {
		const adapter = makeAdapter(schema, options);
		const created: any = await adapter.create({
			model: "user",
			data: { ...input, tags: null, meta: null },
		});
		expect(created.tags).toBeNull();
		expect((sqlite.prepare("select tags from user").get() as any).tags).toBeNull();
	});
});

// A field mapped to a different column name is where the two hooks disagree
// about what `field` means: input gets "user_meta", output gets "meta". Only a
// json column decoding to a string catches it, because everywhere else the
// typeof guards absorb the mismatch.
test("resolves fieldName, not the field key", async () => {
	sqlite.exec("alter table user rename column meta to user_meta");
	const schema = {
		user: t.sqliteTable("user", {
			...baseColumns,
			tags: t.text("tags"),
			user_meta: t.text("user_meta", { mode: "json" }),
		}),
	};
	const adapter = makeAdapter(schema, {
		user: {
			additionalFields: {
				tags: { type: "string[]" as const, required: false },
				meta: { type: "json" as const, required: false, fieldName: "user_meta" },
			},
		},
	});

	await adapter.create({ model: "user", data: { ...input, meta: "pro" } });
	const found: any = await adapter.findOne({
		model: "user",
		where: [{ field: "email", value: "ada@example.com" }],
	});
	expect(found.meta).toBe("pro");
});
