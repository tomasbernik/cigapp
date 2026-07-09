const STORAGE_KEY = "ciglog-v1";
const tags = ["alkohol", "stresovy den", "kava", "vecer vonku", "praca", "nuda"];
const blocks = [
  { id: "rano", label: "Rano", from: 5, to: 9 },
  { id: "doobeda", label: "Doobeda", from: 9, to: 12 },
  { id: "poobede", label: "Poobede", from: 12, to: 17 },
  { id: "vecer", label: "Vecer", from: 17, to: 22 },
  { id: "noc", label: "Noc", from: 22, to: 29 },
];

const initialState = { packs: [], entries: [], days: {}, adjustments: [] };
let state = loadState();

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
  capacityInput: document.querySelector("#capacityInput"),
  adjustmentForm: document.querySelector("#adjustmentForm"),
  adjustmentDateInput: document.querySelector("#adjustmentDateInput"),
  adjustmentAmountInput: document.querySelector("#adjustmentAmountInput"),
  adjustmentNoteInput: document.querySelector("#adjustmentNoteInput"),
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
};

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return { ...initialState, ...stored, adjustments: stored?.adjustments || [] };
  } catch {
    return { ...initialState };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
  const packEntries = state.entries
    .filter((item) => item.packId === entry.packId)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const index = packEntries.findIndex((item) => item.id === entry.id);
  if (index < 1) return 0;

  const previous = packEntries[index - 1];
  return Math.max(0, previous.remaining - entry.remaining);
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

function renderTags() {
  els.tagGrid.innerHTML = tags
    .map((tag) => `<label><input type="checkbox" name="tags" value="${tag}">${tag}</label>`)
    .join("");
}

function renderCurrentDay() {
  const day = state.days[dayKey()] || { tags: [], stress: 0, note: "" };
  els.adjustmentDateInput.value = dayKey();
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
        const sign = amount > 0 ? "+" : "";
        const note = adjustment.note ? ` | ${adjustment.note}` : "";
        return `<article class="history-item"><div><strong>Manualna uprava ${sign}${amount}</strong><span>${adjustment.date}${note}</span></div><strong>${sign}${amount}</strong></article>`;
      }

      const entry = item.entry;
      const pack = state.packs.find((item) => item.id === entry.packId);
      const smoked = entryConsumption(entry);
      const assigned = consumptionDay(entry) !== dayKey(new Date(entry.createdAt)) ? ` | zapocitane ${consumptionDay(entry)}` : "";
      return `<article class="history-item"><div><strong>${entry.remaining} zostava</strong><span>${formatDateTime(entry.createdAt)} | krabicka ${pack?.capacity || "?"}${assigned}</span></div><strong>-${smoked}</strong></article>`;
    })
    .join("");
}

function render() {
  renderStatus();
  renderOverview();
  renderHistory();
}

function addEntry(remaining, options = {}) {
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
  state.entries.push({
    id: id("entry"),
    packId: pack.id,
    remaining,
    createdAt: now.toISOString(),
    consumptionDate: options.assignToPreviousDay ? previousDayKey(now) : dayKey(now),
  });
  saveState();
  els.stateForm.reset();
  els.saveHint.textContent = options.assignToPreviousDay ? "Stav ulozeny, rozdiel je zapocitany do vcera." : "Stav ulozeny.";
  render();
}

function openPack(capacity) {
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
  render();
}

function saveDayContext() {
  state.days[dayKey()] = {
    tags: [...els.tagGrid.querySelectorAll("input:checked")].map((input) => input.value),
    stress: Number(els.stressInput.value),
    note: els.noteInput.value.trim(),
    updatedAt: new Date().toISOString(),
  };
  saveState();
}

function addAdjustment(date, amount, note) {
  state.adjustments.push({
    id: id("adjustment"),
    date,
    amount,
    note,
    createdAt: new Date().toISOString(),
  });
  saveState();
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
  link.download = `ciglog-${dayKey()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

els.stateForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addEntry(Number(els.remainingInput.value), { assignToPreviousDay: els.morningStateInput.checked });
});

els.packForm.addEventListener("submit", (event) => {
  event.preventDefault();
  openPack(Number(els.capacityInput.value));
});

els.adjustmentForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addAdjustment(els.adjustmentDateInput.value, Number(els.adjustmentAmountInput.value), els.adjustmentNoteInput.value.trim());
});

els.contextForm.addEventListener("submit", (event) => {
  event.preventDefault();
  saveDayContext();
  render();
});

els.periodSelect.addEventListener("change", renderOverview);
els.exportCsvButton.addEventListener("click", exportCsv);
els.clearDataButton.addEventListener("click", () => {
  if (!confirm("Vymazat vsetky lokalne data?")) return;
  state = { packs: [], entries: [], days: {}, adjustments: [] };
  saveState();
  renderCurrentDay();
  render();
});

renderTags();
renderCurrentDay();
render();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
