export function normalizeUsername(value) {
  return value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
}

export function authEmailForUsername(username) {
  return `${username}@cigapp.invalid`;
}

export function validateCredentials(rawUsername, password) {
  const username = normalizeUsername(rawUsername);

  if (!username || !password) return { error: "Vypln meno aj heslo." };
  if (username.length < 3) return { error: "Meno musi mat aspon 3 znaky." };
  if (password.length < 6) return { error: "Heslo musi mat aspon 6 znakov." };
  if (username !== rawUsername.trim().toLowerCase()) {
    return { error: "Meno moze obsahovat len pismena bez diakritiky, cisla, _ alebo -." };
  }

  return { username, email: authEmailForUsername(username) };
}

export function signInWithCredentials(client, email, password) {
  return client.auth.signInWithPassword({ email, password });
}

export function signUpWithCredentials(client, username, email, password) {
  return client.auth.signUp({
    email,
    password,
    options: { data: { username, displayName: username } },
  });
}
