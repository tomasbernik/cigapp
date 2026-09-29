import assert from "node:assert/strict";
import test from "node:test";

import {
  authEmailForUsername,
  signInWithCredentials,
  signUpWithCredentials,
  validateCredentials,
} from "../auth.js";

test("username is mapped to the stable internal email", () => {
  assert.equal(authEmailForUsername("tomas_1"), "tomas_1@cigapp.invalid");
  assert.deepEqual(validateCredentials("Tomas_1", "secret1"), {
    username: "tomas_1",
    email: "tomas_1@cigapp.invalid",
  });
});

test("invalid username is rejected before an auth request", () => {
  assert.match(validateCredentials("tomas!", "secret1").error, /Meno moze/);
});

test("failed sign-in never falls back to registration", async () => {
  let signUpCalls = 0;
  const client = {
    auth: {
      signInWithPassword: async () => ({ data: null, error: new Error("invalid credentials") }),
      signUp: async () => {
        signUpCalls += 1;
      },
    },
  };

  const result = await signInWithCredentials(client, "tomas@cigapp.invalid", "wrong-password");
  assert.match(result.error.message, /invalid credentials/);
  assert.equal(signUpCalls, 0);
});

test("registration happens only through the explicit registration action", async () => {
  let payload;
  const client = { auth: { signUp: async (value) => ((payload = value), { data: {}, error: null }) } };
  await signUpWithCredentials(client, "tomas", "tomas@cigapp.invalid", "secret1");
  assert.deepEqual(payload, {
    email: "tomas@cigapp.invalid",
    password: "secret1",
    options: { data: { username: "tomas", displayName: "tomas" } },
  });
});
