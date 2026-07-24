const LEGACY_STORAGE_KEY = ["cig", "log-v1"].join("");
const STORAGE_KEY = "cigapp-v1";
const SUPABASE_URL = "https://zaibtcbpfjnraefxopsv.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_q13caChpMM7g11n5dFdTSA_n9XHlVCO";
const blocks = [
  { id: "rano", label: "Rano", from: 5, to: 9 },
  { id: "doobeda", label: "Doobeda", from: 9, to: 12 },
  { id: "poobede", label: "Poobede", from: 12, to: 17 },
  { id: "vecer", label: "Vecer", from: 17, to: 22 },
  { id: "noc", label: "Noc", from: 22, to: 29 },
];

const initialState = { packs: [], entries: [], days: {}, adjustments: [] };
let state = loadState();
let currentUser = null;
let remoteReady = false;
let visibleCalendarDate = new Date();
let selectedCalendarDay = dayKey();
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
  morningStateInput: document.querySelector("#morningStateInput"),
  saveHint: document.querySelector("#saveHint"),
  packForm: document.querySelector("#packForm"),
  openPackToggle: document.querySelector("#openPackToggle"),
  packOptions: document.querySelector("#packOptions"),
  capacityInput: document.querySelector("#capacityInput"),
  capacityChoices: [...document.querySelectorAll('input[name="capacityChoice"]')],
  adjustmentForm: document.querySelector("#adjustmentForm"),
  adjustmentDateInput: document.querySelector("#adjustmentDateInput"),
  adjustmentAmountInput: document.querySelector("#adjustmentAmountInput"),
  adjustmentNoteInput: document.querySelector("#adjustmentNoteInput"),
  periodSelect: document.querySelector("#periodSelect"),
  totalSmoked: document.querySelector("#totalSmoked"),
  dailyAverage: document.querySelector("#dailyAverage"),
  packsUsed: document.querySelector("#packsUsed"),
  timeBars: document.querySelector("#timeBars"),
  calendarMonthLabel: document.querySelector("#calendarMonthLabel"),
  calendarGrid: document.querySelector("#calendarGrid"),
  dayDetail: document.querySelector("#dayDetail"),
  prevMonthButton: document.querySelector("#prevMonthButton"),
  nextMonthButton: document.querySelector("#nextMonthButton"),
  historyList: document.querySelector("#historyList"),
  exportCsvButton: document.querySelector("#exportCsvButton"),
  clearDataButton: document.querySelector("#clearDataButton"),
  authForm: document.querySelector("#authForm"),
  usernameInput: document.querySelector("#usernameInput"),
  passwordInput: document.querySelector("#passwordInput"),
  signOutButton: document.querySelector("#signOutButton"),
  syncStatus: document.querySelector("#syncStatus"),
};

function loadState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    const parsed = JSON.parse(stored);
    return { ...initialState, ...parsed, adjustments: parsed?.adjustments || [] };
  } catch {
    return { ...initialState };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  localStorage.removeItem(LEGACY_STORAGE_KEY);
}

function setSyncStatus(message) {
  els.syncStatus.textContent = message;
}

function remoteEnabled() {
  return Boolean(supabaseClient && currentUser && remoteReady);
}

function normalizeUsername(value) {
  return value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
}

function authEmailForUsername(username) {
  return `${username}@cigapp.invalid`;
}

function displayNameForUser(user) {
  return user?.user_metadata?.username || user?.email?.split("@")[0] || "pouzivatel";
}

function id(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function dayKey(date = new Date()) {
  const localDate = new Date(date);
  const year = localDate.getFullYear();
  const month = String(localDate.getMonth() + 1).padStart(2, "0");
  const day = String(localDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function previousDayKey(date = new Date()) {
  const previous = new Date(date);
  previous.setDate(previous.getDate() - 1);
  return dayKey(previous);
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("sk-SK", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDayKey(value) {
  return new Intl.DateTimeFormat("sk-SK", {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(`${value}T12:00:00`));
}

function formatLongDate(value) {
  return new Intl.DateTimeFormat("sk-SK", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function monthLabel(date) {
  return new Intl.DateTimeFormat("sk-SK", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function shiftMonth(amount) {
  visibleCalendarDate = new Date(visibleCalendarDate.getFullYear(), visibleCalendarDate.getMonth() + amount, 1);
  renderCalendar();
}

function activePack() {
  return state.packs.find((pack) => pack.active) || null;
}

function latestEntry(packId = activePack()?.id) {
  return [...state.entries].reverse().find((entry) => entry.packId === packId) || null;
}

function consumptionDay(entry) {
  return entry.consumptionDate || dayKey(new Date(entry.createdAt));
}

function entryConsumption(entry) {
  const previous = previousEntry(entry);
  if (!previous) {
    const pack = state.packs.find((item) => item.id === entry.packId);
    if (!pack) return 0;

    return Math.max(0, pack.capacity - entry.remaining);
  }

  return Math.max(0, previous.remaining - entry.remaining);
}

function previousEntry(entry) {
  const packEntries = state.entries
    .filter((item) => item.packId === entry.packId)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const index = packEntries.findIndex((item) => item.id === entry.id);
  return index > 0 ? packEntries[index - 1] : null;
}

function entryConsumptionEvent(entry) {
  const amount = entryConsumption(entry);
  return {
    type: "entry",
    id: entry.id,
    amount,
    date: consumptionDay(entry),
    createdAt: entry.createdAt,
    blockAt: entry.createdAt,
    entry,
  };
}

function adjustmentEvents() {
  return (state.adjustments || []).map((adjustment) => ({
    type: "adjustment",
    id: adjustment.id,
    amount: Number(adjustment.amount) || 0,
    date: adjustment.date,
    createdAt: adjustment.createdAt,
    blockAt: adjustment.createdAt,
    adjustment,
  }));
}

function allConsumptionEvents() {
  return [...state.entries.map(entryConsumptionEvent), ...adjustmentEvents()];
}

function eventsByDay() {
  return allConsumptionEvents().reduce((days, event) => {
    if (!days[event.date]) days[event.date] = [];
    days[event.date].push(event);
    return days;
  }, {});
}

function dayTotal(events) {
  return events.reduce((sum, event) => sum + event.amount, 0);
}

function signedAmount(value) {
  return value > 0 ? `+${value}` : String(value);
}

function adjustmentLabel(value) {
  const amount = Number(value) || 0;
  if (amount > 0) return `+${amount} k dnu`;
  if (amount < 0) return `${amount} z dna`;
  return "0";
}

function shouldDefaultMorningState() {
  const pack = activePack();
  const last = latestEntry(pack?.id);
  if (!pack || !last) return false;

  const today = dayKey();
  const hasEntryToday = state.entries.some((entry) => entry.packId === pack.id && dayKey(new Date(entry.createdAt)) === today);
  return !hasEntryToday && dayKey(new Date(last.createdAt)) < today;
}

function updateMorningStateDefault() {
  els.morningStateInput.checked = shouldDefaultMorningState();
}

function selectedDayStart() {
  return new Date(`${selectedCalendarDay}T00:00:00`);
}

function selectedDayEnd() {
  return new Date(`${selectedCalendarDay}T23:59:59.999`);
}

function dayOpeningState(events) {
  const firstSmokingEvent = events.find((event) => event.type === "entry" && event.amount > 0);
  if (firstSmokingEvent) {
    const previous = previousEntry(firstSmokingEvent.entry);
    const pack = state.packs.find((item) => item.id === firstSmokingEvent.entry.packId);
    if (previous) {
      return {
        remaining: previous.remaining,
        capacity: pack?.capacity || "?",
        label: "Pred prvym zapocitanym fajcenim",
      };
    }

    if (pack) {
      return {
        remaining: pack.capacity,
        capacity: pack.capacity,
        label: "Stav pri otvoreni krabicky",
      };
    }
  }

  const start = selectedDayStart();
  const end = selectedDayEnd();
  const latestBeforeDay = state.entries
    .filter((entry) => new Date(entry.createdAt) < start)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
  const firstStateInDay = state.entries
    .filter((entry) => {
      const createdAt = new Date(entry.createdAt);
      return createdAt >= start && createdAt <= end;
    })
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))[0];
  const entry = latestBeforeDay || firstStateInDay;
  const pack = entry ? state.packs.find((item) => item.id === entry.packId) : null;

  if (!entry) return null;

  return {
    remaining: entry.remaining,
    capacity: pack?.capacity || "?",
    label: latestBeforeDay ? "Stav na zaciatku dna" : "Prvy ulozeny stav v tento den",
  };
}

function blockFor(dateValue) {
  const date = new Date(dateValue);
  const hour = date.getHours();
  const normalized = hour < 5 ? hour + 24 : hour;
  return blocks.find((block) => normalized >= block.from && normalized < block.to) || blocks[0];
}

function getEventsForPeriod(period) {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  let startKey = dayKey(start);
  if (period === "7" || period === "30") {
    start.setDate(start.getDate() - Number(period) + 1);
    startKey = dayKey(start);
  } else if (period === "month") {
    start.setDate(1);
    startKey = dayKey(start);
  } else if (period === "all") {
    return allConsumptionEvents();
  }

  if (period === "today") {
    return allConsumptionEvents().filter((event) => event.date === startKey);
  }

  return allConsumptionEvents().filter((event) => event.date >= startKey);
}

function renderCurrentDay() {
  updateMorningStateDefault();
  els.adjustmentDateInput.value = dayKey();
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
  const events = getEventsForPeriod(els.periodSelect.value);
  const countedEvents = events.filter((event) => event.amount !== 0);
  const total = countedEvents.reduce((sum, event) => sum + event.amount, 0);
  const days = new Set(countedEvents.map((event) => event.date));
  const packs = new Set(events.filter((event) => event.entry).map((event) => event.entry.packId));
  const byBlock = Object.fromEntries(blocks.map((block) => [block.id, 0]));

  countedEvents.forEach((event) => {
    byBlock[blockFor(event.blockAt).id] += event.amount;
  });

  const maxBlock = Math.max(1, ...Object.values(byBlock).map((value) => Math.abs(value)));
  els.totalSmoked.textContent = String(total);
  els.dailyAverage.textContent = days.size ? (total / days.size).toFixed(1) : "0";
  els.packsUsed.textContent = String(packs.size);
  els.timeBars.innerHTML = blocks
    .map((block) => {
      const value = byBlock[block.id];
      return `<div class="bar-row"><span>${block.label}</span><div class="bar-track"><div class="bar-fill" style="width:${(Math.abs(value) / maxBlock) * 100}%"></div></div><strong>${value}</strong></div>`;
    })
    .join("");
}

function renderCalendar() {
  const year = visibleCalendarDate.getFullYear();
  const month = visibleCalendarDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const leadingBlankDays = (firstDay.getDay() + 6) % 7;
  const dayEvents = eventsByDay();
  const today = dayKey();

  els.calendarMonthLabel.textContent = monthLabel(visibleCalendarDate);

  const cells = [];
  for (let index = 0; index < leadingBlankDays; index += 1) {
    cells.push('<div class="calendar-empty"></div>');
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    const date = dayKey(new Date(year, month, day));
    const events = dayEvents[date] || [];
    const total = dayTotal(events);
    const classes = ["calendar-day"];
    if (date === today) classes.push("is-today");
    if (date === selectedCalendarDay) classes.push("is-selected");
    if (total > 0) classes.push("has-smoking");
    if (total < 0) classes.push("has-correction");

    cells.push(`
      <button class="${classes.join(" ")}" type="button" data-date="${date}" aria-pressed="${date === selectedCalendarDay}">
        <span>${day}</span>
        <strong>${total ? total : ""}</strong>
      </button>
    `);
  }

  els.calendarGrid.innerHTML = cells.join("");
  els.calendarGrid.querySelectorAll("button[data-date]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedCalendarDay = button.dataset.date;
      renderCalendar();
    });
  });
  renderDayDetail();
}

function renderDayDetail() {
  const events = (eventsByDay()[selectedCalendarDay] || []).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const countedEvents = events.filter((event) => event.amount !== 0);
  const total = dayTotal(countedEvents);
  const day = state.days[selectedCalendarDay] || { tags: [], stress: 0, note: "" };
  const openingState = dayOpeningState(events);
  const formulaParts = countedEvents.map((event) => signedAmount(event.amount));
  const context = [
    day.tags?.length ? `Tagy: ${day.tags.join(", ")}` : "",
    Number(day.stress) ? `Stres: ${day.stress}/5` : "",
    day.note ? `Poznamka: ${day.note}` : "",
  ].filter(Boolean);

  const items = countedEvents.map((event) => {
    if (event.type === "adjustment") {
      const amount = Number(event.amount) || 0;
      const note = event.adjustment.note ? ` | ${event.adjustment.note}` : "";
      const amountClass = amount < 0 ? "negative" : "positive";
      return `<li><span>Oprava denneho poctu${note}</span><strong class="${amountClass}">${adjustmentLabel(amount)}</strong></li>`;
    }

    const pack = state.packs.find((item) => item.id === event.entry.packId);
    const assigned =
      event.date !== dayKey(new Date(event.entry.createdAt)) ? ` | ranny stav, priradene k ${formatDayKey(event.date)}` : "";
    return `<li><span>${formatDateTime(event.entry.createdAt)} | zostava ${event.entry.remaining} z ${pack?.capacity || "?"}${assigned}</span><strong class="positive">${event.amount} vyfajcenych</strong></li>`;
  });

  els.dayDetail.innerHTML = `
    <div class="day-detail-head">
      <div>
        <span>${formatLongDate(selectedCalendarDay)}</span>
        <strong>${total} vyfajcenych</strong>
      </div>
      <button class="text-button" id="todayCalendarButton" type="button">Dnes</button>
    </div>
    ${
      openingState
        ? `<div class="day-opening-state"><span>${openingState.label}</span><strong>${openingState.remaining} z ${openingState.capacity}</strong></div>`
        : ""
    }
    ${context.length ? `<p class="day-context">${context.join(" | ")}</p>` : ""}
    ${
      items.length
        ? `<ul class="day-event-list">${items.join("")}</ul><p class="day-calculation">Vypocet: ${formulaParts.join(" ")} = ${total}</p>`
        : '<p class="empty">V tento den este nie su ziadne zaznamy.</p>'
    }
  `;

  document.querySelector("#todayCalendarButton").addEventListener("click", () => {
    visibleCalendarDate = new Date();
    selectedCalendarDay = dayKey();
    renderCalendar();
  });
}

function renderHistory() {
  const entryItems = state.entries.map((entry) => ({ type: "entry", entry, createdAt: entry.createdAt }));
  const adjustmentItems = (state.adjustments || []).map((adjustment) => ({
    type: "adjustment",
    adjustment,
    createdAt: adjustment.createdAt,
  }));
  const items = [...entryItems, ...adjustmentItems]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 30);

  if (!items.length) {
    els.historyList.innerHTML = '<p class="empty">Zatial nemas ulozene ziadne stavy.</p>';
    return;
  }

  els.historyList.innerHTML = items
    .map((item) => {
      if (item.type === "adjustment") {
        const adjustment = item.adjustment;
        const amount = Number(adjustment.amount) || 0;
        const note = adjustment.note ? ` | ${adjustment.note}` : "";
        const amountClass = amount < 0 ? "negative" : "positive";
        return `<article class="history-item"><div><strong>Oprava denneho poctu</strong><span>${formatDayKey(adjustment.date)}${note}</span></div><strong class="${amountClass}">${adjustmentLabel(amount)}</strong></article>`;
      }

      const entry = item.entry;
      const pack = state.packs.find((item) => item.id === entry.packId);
      const smoked = entryConsumption(entry);
      const assigned =
        consumptionDay(entry) !== dayKey(new Date(entry.createdAt)) ? ` | priradene k ${formatDayKey(consumptionDay(entry))}` : "";
      const result = smoked > 0 ? `${smoked} vyfajcenych` : "novy stav";
      const title = smoked > 0 ? `${smoked} vyfajcenych` : "Novy stav";
      return `<article class="history-item"><div><strong>${title}</strong><span>${formatDateTime(entry.createdAt)} | zostava ${entry.remaining} z ${pack?.capacity || "?"}${assigned}</span></div><strong>${result}</strong></article>`;
    })
    .join("");
}

function render() {
  renderAuth();
  renderStatus();
  renderOverview();
  renderCalendar();
  renderHistory();
}

function renderAuth() {
  if (!supabaseClient) {
    els.authForm.classList.add("hidden");
    els.signOutButton.classList.add("hidden");
    setSyncStatus("Lokalny rezim. Supabase klient sa nenacital.");
    return;
  }

  els.authForm.classList.toggle("hidden", Boolean(currentUser));
  els.signOutButton.classList.toggle("hidden", !currentUser);
  if (currentUser && remoteReady) {
    setSyncStatus(`Synchronizovane: ${displayNameForUser(currentUser)}`);
  } else if (currentUser) {
    setSyncStatus(`Prihlasene: ${displayNameForUser(currentUser)}. Nacitavam data...`);
  } else {
    setSyncStatus("Lokalny rezim. Prihlas sa menom a heslom.");
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
    consumption_date: consumptionDay(entry),
  };
}

function adjustmentToRow(adjustment) {
  return {
    id: adjustment.id,
    user_id: currentUser.id,
    day: adjustment.date,
    amount: adjustment.amount,
    note: adjustment.note || "",
    created_at: adjustment.createdAt,
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
    consumptionDate: row.consumption_date || dayKey(new Date(row.created_at)),
  };
}

function rowToAdjustment(row) {
  return {
    id: row.id,
    date: row.day,
    amount: row.amount,
    note: row.note || "",
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

  const [
    { data: packs, error: packsError },
    { data: entries, error: entriesError },
    { data: days, error: daysError },
    { data: adjustments, error: adjustmentsError },
  ] = await Promise.all([
    supabaseClient.from("packs").select("*").order("opened_at", { ascending: true }),
    supabaseClient.from("entries").select("*").order("created_at", { ascending: true }),
    supabaseClient.from("days").select("*").order("day", { ascending: true }),
    supabaseClient.from("adjustments").select("*").order("created_at", { ascending: true }),
  ]);

  const error = packsError || entriesError || daysError || adjustmentsError;
  if (error) {
    setSyncStatus(`Supabase chyba: ${error.message}`);
    remoteReady = false;
    return;
  }

  const localHasData = state.packs.length || state.entries.length || Object.keys(state.days).length || state.adjustments.length;
  const remoteHasData = packs.length || entries.length || days.length || adjustments.length;

  if (!remoteHasData && localHasData) {
    remoteReady = true;
    await uploadFullState();
    setSyncStatus(`Lokalne data boli prenesene do Supabase: ${displayNameForUser(currentUser)}`);
  } else {
    state = {
      packs: packs.map(rowToPack),
      entries: entries.map(rowToEntry),
      days: rowsToDays(days),
      adjustments: adjustments.map(rowToAdjustment),
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
  const adjustmentRows = state.adjustments.map(adjustmentToRow);

  const operations = [];
  if (packRows.length) operations.push(supabaseClient.from("packs").upsert(packRows));
  if (entryRows.length) operations.push(supabaseClient.from("entries").upsert(entryRows));
  if (dayRows.length) operations.push(supabaseClient.from("days").upsert(dayRows));
  if (adjustmentRows.length) operations.push(supabaseClient.from("adjustments").upsert(adjustmentRows));

  const results = await Promise.all(operations);
  const error = results.find((result) => result.error)?.error;
  if (error) {
    setSyncStatus(`Supabase chyba: ${error.message}`);
    return false;
  }

  renderAuth();
  return true;
}

async function addEntry(remaining, options = {}) {
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

  const now = new Date();
  const entry = {
    id: id("entry"),
    packId: pack.id,
    remaining,
    createdAt: now.toISOString(),
    consumptionDate: options.assignToPreviousDay ? previousDayKey(now) : dayKey(now),
  };
  state.entries.push(entry);
  saveState();
  await syncRemote(() => supabaseClient.from("entries").upsert(entryToRow(entry)));
  els.stateForm.reset();
  els.saveHint.textContent = options.assignToPreviousDay ? "Stav ulozeny, rozdiel je zapocitany do vcera." : "Stav ulozeny.";
  updateMorningStateDefault();
  render();
}

async function openPack(capacity) {
  const previousPack = activePack();
  const previousLast = previousPack ? latestEntry(previousPack.id) : null;
  const closedEntry =
    previousPack && (!previousLast || previousLast.remaining > 0)
      ? {
          id: id("entry"),
          packId: previousPack.id,
          remaining: 0,
          createdAt: new Date().toISOString(),
        }
      : null;

  if (closedEntry) {
    state.entries.push(closedEntry);
  }

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
    const packResult = await supabaseClient.from("packs").upsert(packToRow(pack));
    if (packResult.error) return packResult;

    if (inactiveRows.length) {
      const inactiveResult = await supabaseClient.from("packs").upsert(inactiveRows);
      if (inactiveResult.error) return inactiveResult;
    }

    const newEntries = [closedEntry, state.entries.at(-1)].filter(Boolean).map(entryToRow);
    return supabaseClient.from("entries").upsert(newEntries);
  });
  updateMorningStateDefault();
  render();
}

function selectedCapacity() {
  const choice = els.capacityChoices.find((input) => input.checked)?.value || "40";
  if (choice === "custom") return Number(els.capacityInput.value);
  return Number(choice);
}

function renderPackOptions() {
  const customSelected = els.capacityChoices.some((input) => input.checked && input.value === "custom");
  els.capacityInput.classList.toggle("hidden", !customSelected);
  els.capacityInput.required = customSelected;
  if (!customSelected) {
    els.capacityInput.value = selectedCapacity();
  }
}

async function addAdjustment(date, amount, note) {
  const adjustment = {
    id: id("adjustment"),
    date,
    amount,
    note,
    createdAt: new Date().toISOString(),
  };
  state.adjustments.push(adjustment);
  saveState();
  await syncRemote(() => supabaseClient.from("adjustments").upsert(adjustmentToRow(adjustment)));
  els.adjustmentAmountInput.value = "";
  els.adjustmentNoteInput.value = "";
  render();
}

function exportCsv() {
  const rows = [
    ["type", "date", "pack_id", "capacity", "remaining", "smoked_since_previous", "consumption_date", "tags", "stress", "note"],
    ...state.entries.map((entry) => {
      const pack = state.packs.find((item) => item.id === entry.packId);
      const day = state.days[consumptionDay(entry)] || {};
      return [
        "entry",
        entry.createdAt,
        entry.packId,
        pack?.capacity || "",
        entry.remaining,
        entryConsumption(entry),
        consumptionDay(entry),
        (day.tags || []).join(";"),
        day.stress ?? "",
        day.note || "",
      ];
    }),
    ...(state.adjustments || []).map((adjustment) => {
      const day = state.days[adjustment.date] || {};
      return [
        "adjustment",
        adjustment.createdAt,
        "",
        "",
        "",
        adjustment.amount,
        adjustment.date,
        (day.tags || []).join(";"),
        day.stress ?? "",
        adjustment.note || day.note || "",
      ];
    }),
  ];

  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `cigapp-${dayKey()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

els.stateForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addEntry(Number(els.remainingInput.value), { assignToPreviousDay: els.morningStateInput.checked });
});

els.packForm.addEventListener("submit", (event) => {
  event.preventDefault();
  openPack(selectedCapacity());
});

els.openPackToggle.addEventListener("click", () => {
  els.packOptions.classList.toggle("hidden");
});

els.capacityChoices.forEach((input) => {
  input.addEventListener("change", renderPackOptions);
});

els.adjustmentForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addAdjustment(els.adjustmentDateInput.value, Number(els.adjustmentAmountInput.value), els.adjustmentNoteInput.value.trim());
});

els.periodSelect.addEventListener("change", renderOverview);
els.prevMonthButton.addEventListener("click", () => shiftMonth(-1));
els.nextMonthButton.addEventListener("click", () => shiftMonth(1));
els.exportCsvButton.addEventListener("click", exportCsv);
els.clearDataButton.addEventListener("click", async () => {
  if (!confirm("Vymazat vsetky data?")) return;
  state = { packs: [], entries: [], days: {}, adjustments: [] };
  saveState();
  if (remoteEnabled()) {
    const [{ error: adjustmentsError }, { error: entriesError }, { error: daysError }, { error: packsError }] = await Promise.all([
      supabaseClient.from("adjustments").delete().eq("user_id", currentUser.id),
      supabaseClient.from("entries").delete().eq("user_id", currentUser.id),
      supabaseClient.from("days").delete().eq("user_id", currentUser.id),
      supabaseClient.from("packs").delete().eq("user_id", currentUser.id),
    ]);
    const error = adjustmentsError || entriesError || daysError || packsError;
    if (error) setSyncStatus(`Supabase chyba: ${error.message}`);
  }
  renderCurrentDay();
  render();
});

els.authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!supabaseClient) return;

  const rawUsername = els.usernameInput.value;
  const username = normalizeUsername(rawUsername);
  const password = els.passwordInput.value;
  if (!username || !password) return;

  if (username.length < 3) {
    setSyncStatus("Meno musi mat aspon 3 znaky.");
    return;
  }

  if (password.length < 6) {
    setSyncStatus("Heslo musi mat aspon 6 znakov.");
    return;
  }

  if (username !== rawUsername.trim().toLowerCase()) {
    els.usernameInput.value = username;
    setSyncStatus("Meno moze obsahovat len pismena bez diakritiky, cisla, _ alebo -.");
    return;
  }

  const email = authEmailForUsername(username);
  setSyncStatus("Prihlasujem...");
  let { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

  if (error) {
    const signup = await supabaseClient.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });
    data = signup.data;
    error = signup.error;

    if (error && /already|registered|exists/i.test(error.message)) {
      setSyncStatus("Toto meno uz existuje. Skus ine meno alebo spravne heslo.");
      return;
    }
  }

  if (error) {
    setSyncStatus(`Login chyba: ${error.message}`);
    return;
  }

  currentUser = data.user || data.session?.user || null;
  remoteReady = false;
  els.passwordInput.value = "";

  if (currentUser) {
    await loadRemoteState();
  } else {
    setSyncStatus("Ucet je vytvoreny, ale Supabase vyzaduje potvrdenie emailu. Vypni email confirmation v Supabase.");
  }
});

els.signOutButton.addEventListener("click", async () => {
  if (!supabaseClient) return;
  await supabaseClient.auth.signOut();
  currentUser = null;
  remoteReady = false;
  state = loadState();
  renderCurrentDay();
  render();
});

renderCurrentDay();
renderPackOptions();
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
