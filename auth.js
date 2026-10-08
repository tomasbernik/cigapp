export function normalizeEmail(value) {
  return value.trim().toLowerCase();
}

export function validateEmail(value) {
  const email = normalizeEmail(value);
  if (!email) return { error: "Zadaj e-mail." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Zadaj platny e-mail." };
  return { email };
}

export function validateOtp(value) {
  const token = value.trim().replace(/\s/g, "");
  if (!/^\d{6}$/.test(token)) return { error: "Zadaj sestmiestny kod z e-mailu." };
  return { token };
}

export function requestEmailOtp(client, email) {
  return client.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
}

export function verifyEmailOtp(client, email, token) {
  return client.auth.verifyOtp({ email, token, type: "email" });
}
