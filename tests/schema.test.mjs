import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const schema = await readFile(new URL("../neon/schema.sql", import.meta.url), "utf8");
const tables = ["packs", "entries", "days", "adjustments"];

test("all app tables enforce Neon user ownership and RLS", () => {
  for (const table of tables) {
    assert.match(schema, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
    assert.match(schema, new RegExp(`on public\\.${table} for all to authenticated`, "i"));
  }
  assert.equal((schema.match(/default \(auth\.user_id\(\)\)::uuid/gi) || []).length, 4);
  assert.equal((schema.match(/using \(\(select auth\.user_id\(\)\)::uuid = user_id\)/gi) || []).length, 4);
  assert.equal((schema.match(/with check \(\(select auth\.user_id\(\)\)::uuid = user_id\)/gi) || []).length, 4);
});

test("anonymous has no table grants and authenticated has CRUD", () => {
  assert.match(schema, /revoke all on table[\s\S]+from public, anonymous;/i);
  assert.match(schema, /grant select, insert, update, delete[\s\S]+to authenticated;/i);
});

test("entries cannot reference another tenant's pack", () => {
  assert.match(schema, /foreign key \(pack_id, user_id\)[\s\S]+references public\.packs\(id, user_id\)/i);
});
