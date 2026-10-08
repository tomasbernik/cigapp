import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeEmail,
  requestEmailOtp,
  validateEmail,
  validateOtp,
  verifyEmailOtp,
} from "../auth.js";

test("email is normalized and validated", () => {
  assert.equal(normalizeEmail("  Tomas.Bernik@GMAIL.COM "), "tomas.bernik@gmail.com");
  assert.deepEqual(validateEmail("  Tomas.Bernik@GMAIL.COM "), { email: "tomas.bernik@gmail.com" });
  assert.match(validateEmail("tomas").error, /platny e-mail/);
});

test("OTP must contain exactly six digits", () => {
  assert.deepEqual(validateOtp(" 123 456 "), { token: "123456" });
  assert.match(validateOtp("12345").error, /sestmiestny/);
  assert.match(validateOtp("12345a").error, /sestmiestny/);
});

test("requestEmailOtp delegates to Neon Auth", async () => {
  let payload;
  const client = { auth: { signInWithOtp: async (value) => ((payload = value), { data: {}, error: null }) } };
  await requestEmailOtp(client, "tomas.bernik@gmail.com");
  assert.deepEqual(payload, {
    email: "tomas.bernik@gmail.com",
    options: { shouldCreateUser: true },
  });
});

test("verifyEmailOtp uses the email token type", async () => {
  let payload;
  const client = { auth: { verifyOtp: async (value) => ((payload = value), { data: {}, error: null }) } };
  await verifyEmailOtp(client, "tomas.bernik@gmail.com", "123456");
  assert.deepEqual(payload, {
    email: "tomas.bernik@gmail.com",
    token: "123456",
    type: "email",
  });
});
