import assert from "node:assert/strict";
import test from "node:test";
import { createClient, SupabaseAuthAdapter } from "@neondatabase/neon-js";

const requiredEnvironment = [
  "NEON_AUTH_URL",
  "NEON_DATA_API_URL",
  "NEON_TEST_USER_A_EMAIL",
  "NEON_TEST_USER_A_PASSWORD",
  "NEON_TEST_USER_B_EMAIL",
  "NEON_TEST_USER_B_PASSWORD",
];
const missingEnvironment = requiredEnvironment.filter((name) => !process.env[name]);

function client() {
  return createClient({
    auth: { adapter: SupabaseAuthAdapter(), url: process.env.NEON_AUTH_URL, allowAnonymous: false },
    dataApi: { url: process.env.NEON_DATA_API_URL, options: { db: { schema: "public" } } },
  });
}

async function signIn(neon, email, password) {
  const { data, error } = await neon.auth.signInWithPassword({ email, password });
  assert.ifError(error);
  const user = data.user || data.session?.user;
  assert.ok(user?.id, "test user session must contain an id");
  return user;
}

test(
  "Neon RLS rejects anonymous and cross-user access",
  { skip: missingEnvironment.length ? `missing ${missingEnvironment.join(", ")}` : false },
  async () => {
    const ownerClient = client();
    const strangerClient = client();
    const owner = await signIn(ownerClient, process.env.NEON_TEST_USER_A_EMAIL, process.env.NEON_TEST_USER_A_PASSWORD);
    const stranger = await signIn(
      strangerClient,
      process.env.NEON_TEST_USER_B_EMAIL,
      process.env.NEON_TEST_USER_B_PASSWORD,
    );
    const packId = `rls-test-${crypto.randomUUID()}`;

    try {
      const created = await ownerClient
        .from("packs")
        .insert({
          id: packId,
          user_id: owner.id,
          capacity: 20,
          price: 0,
          active: false,
          opened_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      assert.ifError(created.error);

      const anonymousResponse = await fetch(
        `${process.env.NEON_DATA_API_URL}/packs?id=eq.${encodeURIComponent(packId)}&select=id`,
        { headers: { Accept: "application/json" } },
      );
      assert.equal(anonymousResponse.ok, false, "anonymous role must not have table access");

      const crossRead = await strangerClient.from("packs").select("id").eq("id", packId);
      assert.ifError(crossRead.error);
      assert.deepEqual(crossRead.data, []);

      const crossUpdate = await strangerClient.from("packs").update({ capacity: 19 }).eq("id", packId).select("id");
      assert.ifError(crossUpdate.error);
      assert.deepEqual(crossUpdate.data, []);

      const crossTenantEntry = await strangerClient.from("entries").insert({
        id: `rls-test-entry-${crypto.randomUUID()}`,
        user_id: stranger.id,
        pack_id: packId,
        remaining: 19,
        created_at: new Date().toISOString(),
        consumption_date: new Date().toISOString().slice(0, 10),
      });
      assert.ok(crossTenantEntry.error, "tenant-safe foreign key must reject another user's pack");
    } finally {
      await ownerClient.from("packs").delete().eq("id", packId);
      await ownerClient.auth.signOut();
      await strangerClient.auth.signOut();
    }
  },
);
