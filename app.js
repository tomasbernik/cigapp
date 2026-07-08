const STORAGE_KEY = "ciglog-v1";
const AUTH_EMAIL_KEY = "ciglog-auth-email";
const SUPABASE_URL = "https://zaibtcbpfjnraefxopsv.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_q13caChpMM7g11n5dFdTSA_n9XHlVCO";
const tags = ["alkohol", "stresovy den", "kava", "vecer vonku", "praca", "nuda"];
const blocks = [
  { id: "rano", label: "Rano", from: 5, to: 9 },
  { id: "doobeda", label: "Doobeda", from: 9, to: 12 },
  { id: "poobede", label: "Poobede", from: 12, to: 17 },
  { id: "vecer", label: "Vecer", from: 17, to: 22 },
  { id: "noc", label: "Noc", from: 22, to: 29 },
];

const initialState = { packs: [], entries: [], days: {} };
let state = loadState();
let currentUser = null;
let remoteReady = false;
let pendingEmail = localStorage.getItem(AUTH_EMAIL_KEY) || "";
const supabaseClient =
  window.supabase?.createClient?.(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  }) || null;

const els = {
  currentCount: document.querySelector("#currentCount"),
  currentCapacity: document.querySelector("#currentCapacity"),
  packRing: document.querySelector("#packRing"),
  packPercent: document.querySelector("#packPercent"),
  stateForm: document.querySelector("#stateForm"),
  remainingInput: document.querySelector("#remainingInput"),
  saveHint: document.querySelector("#saveHint"),
  packForm: document.querySelector("#packForm"),
  capacityInput: document.querySelector("#capacityInput"),
  tagGrid: document.querySelector("#tagGrid"),
  contextForm: document.querySelector("#contextForm"),
  stressInput: document.querySelector("#stressInput"),
  noteInput: document.querySelector("#noteInput"),
  periodSelect: document.querySelector("#periodSelect"),
  totalSmoked: document.querySelector("#totalSmoked"),
  dailyAverage: document.querySelector("#dailyAverage"),
  packsUsed: document.querySelector("#packsUsed"),
  timeBars: document.querySelector("#timeBars"),
  historyList: document.querySelector("#historyList"),
  exportCsvButton: document.querySelector("#exportCsvButton"),
  clearDataButton: document.querySelector("#clearDataButton"),
  authForm: document.querySelector("#authForm"),
  emailInput: document.querySelector("#emailInput"),
  otpForm: document.querySelector("#otpForm"),
  otpInput: document.querySelector("#otpInput"),
  changeEmailButton: document.querySelector("#changeEmailButton"),
  signOutButton: document.querySelector("#signOutButton"),
  syncStatus: document.querySelector("#syncStatus"),
};

function loadState() {
  try {
    return { ...initialState, ...JSON.parse(localStorage.getItem(STORAGE_KEY)) };
  } catch {
    return { ...initialState };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function setSyncStatus(message) {
  els.syncStatus.textContent = message;
}

function remoteEnabled() {
  return Boolean(supabaseClient && currentUser && remoteReady);
}

function id(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function dayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("sk-SK", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function activePack() {
  return state.packs.find((pack) => pack.active) || null;
}

function latestEntry(packId = activePack()?.id) {
  return [...state.entries].reverse().find((entry) => entry.packId === packId) || null;
}

function entryConsumption(entry) {
  const packEntries = state.entries
    .filter((item) => item.packId === entry.packId)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const index = packEntries.findIndex((item) => item.id === entry.id);
  if (index < 1) return 0;

  const previous = packEntries[index - 1];
  return Math.max(0, previous.remaining - entry.remaining);
}

function blockFor(dateValue) {
  const date = new Date(dateValue);
  const hour = date.getHours();
  const normalized = hour < 5 ? hour + 24 : hour;
  return blocks.find((block) => normalized >= block.from && normalized < block.to) || blocks[0];
}

function getEntriesForPeriod(period) {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (period === "7" || period === "30") {
    start.setDate(start.getDate() - Number(period) + 1);
  } else if (period === "month") {
    start.setDate(1);
  } else if (period === "all") {
    return state.entries;
  }

  return state.entries.filter((entry) => new Date(entry.createdAt) >= start);
}

function renderTags() {
  els.tagGrid.innerHTML = tags
    .map((tag) => `<label><input type="checkbox" name="tags" value="${tag}">${tag}</label>`)
    .join("");
}

function renderCurrentDay() {
  const day = state.days[dayKey()] || { tags: [], stress: 0, note: "" };
  els.stressInput.value = day.stress || 0;
  els.noteInput.value = day.note || "";
  els.tagGrid.querySelectorAll("input").forEach((input) => {
    input.checked = day.tags?.includes(input.value) || false;
  });
}

function renderStatus() {
  const pack = activePack();
  const last = latestEntry();
  if (!pack) {
    els.currentCount.textContent = "-";
    els.currentCapacity.textContent = "ziadna krabicka";
    els.packPercent.textContent = "0%";
    els.packRing.style.background = "conic-gradient(#e7edf4 0deg, #e7edf4 0deg)";
    els.remainingInput.max = "";
    return;
  }

  const remaining = last ? last.remaining : pack.capacity;
  const percent = Math.round((remaining / pack.capacity) * 100);
  els.currentCount.textContent = remaining;
  els.currentCapacity.textContent = `z ${pack.capacity} cigariet`;
  els.packPercent.textContent = `${percent}%`;
  els.packRing.style.background = `conic-gradient(var(--teal) ${percent * 3.6}deg, #e7edf4 0deg)`;
  els.remainingInput.max = String(pack.capacity);
  els.remainingInput.placeholder = String(remaining);
}

function renderOverview() {
  const entries = getEntriesForPeriod(els.periodSelect.value);
  const total = entries.reduce((sum, entry) => sum + entryConsumption(entry), 0);
  const days = new Set(entries.map((entry) => dayKey(new Date(entry.createdAt))));
  const packs = new Set(entries.map((entry) => entry.packId));
  const byBlock = Object.fromEntries(blocks.map((block) => [block.id, 0]));

  entries.forEach((entry) => {
    byBlock[blockFor(entry.createdAt).id] += entryConsumption(entry);
  });

  const maxBlock = Math.max(1, ...Object.values(byBlock));
  els.totalSmoked.textContent = String(total);
  els.dailyAverage.textContent = days.size ? (total / days.size).toFixed(1) : "0";
  els.packsUsed.textContent = String(packs.size);
  els.timeBars.innerHTML = blocks
    .map((block) => {
      const value = byBlock[block.id];
      return `<div class="bar-row"><span>${block.label}</span><div class="bar-track"><div class="bar-fill" style="width:${(value / maxBlock) * 100}%"></div></div><strong>${value}</strong></div>`;
    })
    .join("");
}

function renderHistory() {
  const items = [...state.entries]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 30);

  if (!items.length) {
    els.historyList.innerHTML = '<p class="empty">Zatial nemas ulozene ziadne stavy.</p>';
    return;
  }

  els.historyList.innerHTML = items
    .map((entry) => {
      const pack = state.packs.find((item) => item.id === entry.packId);
      const smoked = entryConsumption(entry);
      return `<article class="history-item"><div><strong>${entry.remaining} zostava</strong><span>${formatDateTime(entry.createdAt)} | krabicka ${pack?.capacity || "?"}</span></div><strong>-${smoked}</strong></article>`;
    })
    .join("");
}

function render() {
  renderAuth();
  renderStatus();
  renderOverview();
  renderHistory();
}

function renderAuth() {
  if (!supabaseClient) {
    els.authForm.classList.add("hidden");
    els.otpForm.classList.add("hidden");
    els.signOutButton.classList.add("hidden");
    setSyncStatus("Lokalny rezim. Supabase klient sa nenacital.");
    return;
  }

  els.authForm.classList.toggle("hidden", Boolean(currentUser) || Boolean(pendingEmail));
  els.otpForm.classList.toggle("hidden", Boolean(currentUser) || !pendingEmail);
  els.signOutButton.classList.toggle("hidden", !currentUser);
  if (currentUser && remoteReady) {
    setSyncStatus(`Synchronizovane: ${currentUser.email}`);
  } else if (currentUser) {
    setSyncStatus(`Prihlasene: ${currentUser.email}. Nacitavam data...`);
  } else if (pendingEmail) {
    setSyncStatus(`Kod bol poslany na ${pendingEmail}. Zadaj ho tu v appke.`);
  } else {
    setSyncStatus("Lokalny rezim. Po prihlaseni kodom sa data ulozia do Supabase.");
  }
}

function packToRow(pack) {
  return {
    id: pack.id,
    user_id: currentUser.id,
    capacity: pack.capacity,
    active: pack.active,
    opened_at: pack.openedAt,
  };
}

function entryToRow(entry) {
  return {
    id: entry.id,
    user_id: currentUser.id,
    pack_id: entry.packId,
    remaining: entry.remaining,
    created_at: entry.createdAt,
  };
}

function dayToRow(key, day) {
  return {
    user_id: currentUser.id,
    day: key,
    tags: day.tags || [],
    stress: day.stress || 0,
    note: day.note || "",
    updated_at: day.updatedAt || new Date().toISOString(),
  };
}

function rowToPack(row) {
  return {
    id: row.id,
    capacity: row.capacity,
    active: row.active,
    openedAt: row.opened_at,
  };
}

function rowToEntry(row) {
  return {
    id: row.id,
    packId: row.pack_id,
    remaining: row.remaining,
    createdAt: row.created_at,
  };
}

function rowsToDays(rows) {
  return Object.fromEntries(
    rows.map((row) => [
      row.day,
      {
        tags: row.tags || [],
        stress: row.stress || 0,
        note: row.note || "",
        updatedAt: row.updated_at,
      },
    ]),
  );
}

async function loadRemoteState() {
  if (!supabaseClient || !currentUser) return;
  remoteReady = false;
  renderAuth();

  const [{ data: packs, error: packsError }, { data: entries, error: entriesError }, { data: days, error: daysError }] =
    await Promise.all([
      supabaseClient.from("packs").select("*").order("opened_at", { ascending: true }),
      supabaseClient.from("entries").select("*").order("created_at", { ascending: true }),
      supabaseClient.from("days").select("*").order("day", { ascending: true }),
    ]);

  const error = packsError || entriesError || daysError;
  if (error) {
    setSyncStatus(`Supabase chyba: ${error.message}`);
    remoteReady = false;
    return;
  }

  const localHasData = state.packs.length || state.entries.length || Object.keys(state.days).length;
  const remoteHasData = packs.length || entries.length || days.length;

  if (!remoteHasData && localHasData) {
    remoteReady = true;
    await uploadFullState();
    setSyncStatus(`Lokalne data boli prenesene do Supabase: ${currentUser.email}`);
  } else {
    state = {
      packs: packs.map(rowToPack),
      entries: entries.map(rowToEntry),
      days: rowsToDays(days),
    };
    saveState();
    remoteReady = true;
  }

  renderCurrentDay();
  render();
}

async function syncRemote(operation) {
  if (!remoteEnabled()) return true;

  const { error } = await operation();
  if (error) {
    setSyncStatus(`Supabase chyba: ${error.message}`);
    return false;
  }

  renderAuth();
  return true;
}

async function uploadFullState() {
  if (!remoteEnabled()) return true;

  const packRows = state.packs.map(packToRow);
  const entryRows = state.entries.map(entryToRow);
  const dayRows = Object.entries(state.days).map(([key, day]) => dayToRow(key, day));

  const operations = [];
  if (packRows.length) operations.push(supabaseClient.from("packs").upsert(packRows));
  if (entryRows.length) operations.push(supabaseClient.from("entries").upsert(entryRows));
  if (dayRows.length) operations.push(supabaseClient.from("days").upsert(dayRows));

  const results = await Promise.all(operations);
  const error = results.find((result) => result.error)?.error;
  if (error) {
    setSyncStatus(`Supabase chyba: ${error.message}`);
    return false;
  }

  renderAuth();
  return true;
}

async function addEntry(remaining) {
  const pack = activePack();
  if (!pack) {
    els.saveHint.textContent = "Najprv otvor novu krabicku.";
    return;
  }

  if (remaining > pack.capacity) {
    els.saveHint.textContent = `Maximum pre tuto krabicku je ${pack.capacity}.`;
    return;
  }

  const last = latestEntry(pack.id);
  if (last && remaining > last.remaining) {
    els.saveHint.textContent = "Vyssi stav patri do novej krabicky.";
    return;
  }

  const entry = {
    id: id("entry"),
    packId: pack.id,
    remaining,
    createdAt: new Date().toISOString(),
  };
  state.entries.push(entry);
  saveState();
  await syncRemote(() => supabaseClient.from("entries").upsert(entryToRow(entry)));
  els.stateForm.reset();
  els.saveHint.textContent = "Stav ulozeny.";
  render();
}

async function openPack(capacity) {
  state.packs = state.packs.map((pack) => ({ ...pack, active: false }));
  const pack = {
    id: id("pack"),
    capacity,
    active: true,
    openedAt: new Date().toISOString(),
  };
  state.packs.push(pack);
  state.entries.push({
    id: id("entry"),
    packId: pack.id,
    remaining: capacity,
    createdAt: pack.openedAt,
  });
  saveState();
  await syncRemote(async () => {
    const inactiveRows = state.packs.filter((item) => item.id !== pack.id).map(packToRow);
    const operations = [supabaseClient.from("packs").upsert(packToRow(pack))];
    if (inactiveRows.length) operations.push(supabaseClient.from("packs").upsert(inactiveRows));
    operations.push(supabaseClient.from("entries").upsert(entryToRow(state.entries.at(-1))));
    const results = await Promise.all(operations);
    return { error: results.find((result) => result.error)?.error || null };
  });
  render();
}

async function saveDayContext() {
  state.days[dayKey()] = {
    tags: [...els.tagGrid.querySelectorAll("input:checked")].map((input) => input.value),
    stress: Number(els.stressInput.value),
    note: els.noteInput.value.trim(),
    updatedAt: new Date().toISOString(),
  };
  saveState();
  await syncRemote(() => supabaseClient.from("days").upsert(dayToRow(dayKey(), state.days[dayKey()])));
}

function exportCsv() {
  const rows = [
    ["type", "date", "pack_id", "capacity", "remaining", "smoked_since_previous", "tags", "stress", "note"],
    ...state.entries.map((entry) => {
      const pack = state.packs.find((item) => item.id === entry.packId);
      const day = state.days[dayKey(new Date(entry.createdAt))] || {};
      return [
        "entry",
        entry.createdAt,
        entry.packId,
        pack?.capacity || "",
        entry.remaining,
        entryConsumption(entry),
        (day.tags || []).join(";"),
        day.stress ?? "",
        day.note || "",
      ];
    }),
  ];

  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `ciglog-${dayKey()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

els.stateForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addEntry(Number(els.remainingInput.value));
});

els.packForm.addEventListener("submit", (event) => {
  event.preventDefault();
  openPack(Number(els.capacityInput.value));
});

els.contextForm.addEventListener("submit", (event) => {
  event.preventDefault();
  saveDayContext();
  render();
});

els.periodSelect.addEventListener("change", renderOverview);
els.exportCsvButton.addEventListener("click", exportCsv);
els.clearDataButton.addEventListener("click", async () => {
  if (!confirm("Vymazat vsetky data?")) return;
  state = { packs: [], entries: [], days: {} };
  saveState();
  if (remoteEnabled()) {
    const [{ error: entriesError }, { error: daysError }, { error: packsError }] = await Promise.all([
      supabaseClient.from("entries").delete().eq("user_id", currentUser.id),
      supabaseClient.from("days").delete().eq("user_id", currentUser.id),
      supabaseClient.from("packs").delete().eq("user_id", currentUser.id),
    ]);
    const error = entriesError || daysError || packsError;
    if (error) setSyncStatus(`Supabase chyba: ${error.message}`);
  }
  renderCurrentDay();
  render();
});

els.authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!supabaseClient) return;

  const email = els.emailInput.value.trim();
  if (!email) return;

  const { error } = await supabaseClient.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (error) {
    setSyncStatus(`Login chyba: ${error.message}`);
    return;
  }

  pendingEmail = email;
  localStorage.setItem(AUTH_EMAIL_KEY, pendingEmail);
  els.otpInput.value = "";
  renderAuth();
});

els.otpForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!supabaseClient || !pendingEmail) return;

  const token = els.otpInput.value.trim().replace(/\s/g, "");
  if (!token) return;

  const { data, error } = await supabaseClient.auth.verifyOtp({
    email: pendingEmail,
    token,
    type: "email",
  });

  if (error) {
    setSyncStatus(`Kod nesedi: ${error.message}`);
    return;
  }

  pendingEmail = "";
  localStorage.removeItem(AUTH_EMAIL_KEY);
  els.otpInput.value = "";
  currentUser = data.user || data.session?.user || null;
  remoteReady = false;
  if (currentUser) {
    await loadRemoteState();
  } else {
    render();
  }
});

els.changeEmailButton.addEventListener("click", () => {
  pendingEmail = "";
  localStorage.removeItem(AUTH_EMAIL_KEY);
  els.otpInput.value = "";
  renderAuth();
});

els.signOutButton.addEventListener("click", async () => {
  if (!supabaseClient) return;
  await supabaseClient.auth.signOut();
  currentUser = null;
  remoteReady = false;
  pendingEmail = "";
  localStorage.removeItem(AUTH_EMAIL_KEY);
  state = loadState();
  renderCurrentDay();
  render();
});

renderTags();
renderCurrentDay();
render();

if (supabaseClient) {
  supabaseClient.auth.getSession().then(({ data }) => {
    currentUser = data.session?.user || null;
    if (currentUser) {
      loadRemoteState();
    } else {
      render();
    }
  });

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    const nextUser = session?.user || null;
    const changedUser = nextUser?.id !== currentUser?.id;
    currentUser = nextUser;
    if (currentUser && changedUser) {
      loadRemoteState();
    } else {
      render();
    }
  });
}

if ("serviceWorker" in navigator) {
  let refreshing = false;

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  navigator.serviceWorker.register("sw.js").then((registration) => {
    registration.update();
  }).catch(() => {});
}
