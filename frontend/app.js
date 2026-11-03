// Toshkent Uy Narxlari — frontend mantiqi
const MAX_COMPARE = 4;
const compareIds = new Set();

const LABELS = {
  yangi: "Yangi bino",
  ikkilamchi: "Ikkilamchi",
  yevro: "Yevro ta'mir",
  oddiy: "Oddiy ta'mir",
  tamirsiz: "Ta'mirsiz",
};

const $ = (sel) => document.querySelector(sel);
const usd = (n) => "$" + Math.round(n).toLocaleString("ru-RU");
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || "Xatolik yuz berdi");
    err.fields = data.fields;
    throw err;
  }
  return data;
}

// ---------- Tablar ----------
function showTab(name) {
  document.querySelectorAll(".tab").forEach((b) => b.classList.toggle("active", b.dataset.tab === name));
  document.querySelectorAll(".panel").forEach((p) => (p.hidden = p.id !== "tab-" + name));
  if (name === "stats") loadStats();
  if (name === "compare") loadCompare();
  updateCompareBar();
}

// ---------- E'lonlar ----------
function filterQuery() {
  const params = new URLSearchParams();
  for (const [k, v] of new FormData($("#filters"))) if (v) params.set(k, v);
  return params.toString();
}

async function loadListings() {
  const box = $("#listings");
  try {
    const items = await api("/api/listings?" + filterQuery());
    $("#listings-summary").textContent = items.length
      ? `${items.length} ta e'lon topildi · o'rtacha ${usd(avg(items.map((i) => i.price_per_m2)))} / m²`
      : "";
    box.innerHTML = items.length
      ? items.map(cardHtml).join("")
      : `<div class="empty">Bu filtrlar bo'yicha e'lon topilmadi.</div>`;
  } catch (e) {
    box.innerHTML = `<div class="empty">${esc(e.message)}</div>`;
  }
}

const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

function cardHtml(i) {
  const selected = compareIds.has(i.id);
  return `
  <article class="card ${selected ? "selected" : ""}" data-id="${i.id}">
    <div class="card-head">
      <div class="card-title">${esc(i.title)}</div>
      <span class="badge">${esc(i.district)}</span>
    </div>
    <div>
      <div class="price">${usd(i.price)}</div>
      <div class="ppm">${usd(i.price_per_m2)} / m²</div>
    </div>
    <div class="specs">
      <span>🛏 ${i.rooms} xona</span>
      <span>📐 ${i.area} m²</span>
      <span>🏢 ${i.floor}/${i.total_floors} qavat</span>
    </div>
    <div class="specs muted">
      <span>${LABELS[i.building_type] || esc(i.building_type)}</span>
      <span>${LABELS[i.renovation] || esc(i.renovation)}</span>
    </div>
    ${i.description ? `<p class="desc">${esc(i.description)}</p>` : ""}
    <div class="card-actions">
      <label class="check"><input type="checkbox" data-action="compare" ${selected ? "checked" : ""}> Solishtirish</label>
      <button class="btn small ghost danger" data-action="delete">O'chirish</button>
    </div>
  </article>`;
}

async function onListingsClick(e) {
  const card = e.target.closest(".card");
  if (!card) return;
  const id = Number(card.dataset.id);
  const action = e.target.dataset.action;

  if (action === "compare") {
    if (e.target.checked) {
      if (compareIds.size >= MAX_COMPARE) {
        e.target.checked = false;
        alert(`Ko'pi bilan ${MAX_COMPARE} ta e'lonni solishtirish mumkin.`);
        return;
      }
      compareIds.add(id);
    } else {
      compareIds.delete(id);
    }
    card.classList.toggle("selected", compareIds.has(id));
    updateCompareBar();
  }

  if (action === "delete") {
    if (!confirm("Ushbu e'lonni o'chirasizmi?")) return;
    try {
      await api("/api/listings/" + id, { method: "DELETE" });
      compareIds.delete(id);
      updateCompareBar();
      loadListings();
    } catch (err) {
      alert(err.message);
    }
  }
}

function updateCompareBar() {
  const n = compareIds.size;
  const pill = $("#compare-count");
  pill.textContent = n;
  pill.hidden = n === 0;
  const onCompareTab = !$("#tab-compare").hidden;
  $("#compare-bar").hidden = n === 0 || onCompareTab;
  $("#compare-bar-text").textContent = `Tanlandi: ${n}/${MAX_COMPARE}`;
}

// ---------- Solishtirish ----------
async function loadCompare() {
  const view = $("#compare-view");
  if (compareIds.size < 2) {
    view.innerHTML = `<div class="empty">Solishtirish uchun "E'lonlar" bo'limida kamida 2 ta e'lonni belgilang (ko'pi bilan ${MAX_COMPARE}).</div>`;
    return;
  }
  try {
    const items = await api("/api/compare?ids=" + [...compareIds].join(","));
    view.innerHTML = compareTable(items);
  } catch (e) {
    view.innerHTML = `<div class="empty">${esc(e.message)}</div>`;
  }
}

function compareTable(items) {
  // best: "min" yoki "max" — eng yaxshi qiymat yashil rangda belgilanadi
  const rows = [
    { label: "Narx", value: (i) => i.price, fmt: usd, best: "min" },
    { label: "Narx / m²", value: (i) => i.price_per_m2, fmt: usd, best: "min" },
    { label: "Maydon", value: (i) => i.area, fmt: (v) => v + " m²", best: "max" },
    { label: "Xonalar", value: (i) => i.rooms, fmt: (v) => v, best: "max" },
    { label: "Qavat", value: (i) => `${i.floor}/${i.total_floors}` },
    { label: "Bino turi", value: (i) => LABELS[i.building_type] },
    { label: "Ta'mir", value: (i) => LABELS[i.renovation] },
    { label: "Tuman o'rtachasi / m²", value: (i) => i.district_avg_ppm, fmt: usd },
    {
      label: "Tuman o'rtachasiga nisbatan",
      value: (i) => i.diff_pct,
      fmt: (v) => `<span class="${v <= 0 ? "diff-low" : "diff-high"}">${v > 0 ? "+" : ""}${v}% ${v <= 0 ? "arzon" : "qimmat"}</span>`,
      best: "min",
      raw: true,
    },
  ];

  const head = items
    .map((i) => `<th class="compare-head">${esc(i.title)}<br><span class="badge">${esc(i.district)}</span></th>`)
    .join("");

  const body = rows
    .map((r) => {
      const values = items.map(r.value);
      let bestVal = null;
      if (r.best) bestVal = r.best === "min" ? Math.min(...values) : Math.max(...values);
      const cells = values
        .map((v) => {
          const shown = r.fmt ? r.fmt(v) : v;
          const text = r.raw || r.fmt ? shown : esc(shown);
          const isBest = bestVal !== null && v === bestVal && new Set(values).size > 1;
          return `<td class="${isBest ? "best" : ""}">${text}</td>`;
        })
        .join("");
      return `<tr><th>${r.label}</th>${cells}</tr>`;
    })
    .join("");

  const cheapest = items.reduce((a, b) => (a.price_per_m2 <= b.price_per_m2 ? a : b));
  return `
    <div class="card-block">
      <h2>E'lonlarni solishtirish</h2>
      <p class="muted">Yashil — eng yaxshi qiymat. Kvadrat metr bo'yicha eng arzoni: <b>${esc(cheapest.title)}</b> (${usd(cheapest.price_per_m2)} / m²).</p>
      <div class="table-wrap"><table class="table"><thead><tr><th></th>${head}</tr></thead><tbody>${body}</tbody></table></div>
    </div>`;
}

// ---------- Statistika ----------
async function loadStats() {
  try {
    const s = await api("/api/stats");
    renderTiles(s);
    renderDistrictChart(s.districts);
    renderRoomsTable(s.by_rooms);
  } catch (e) {
    $("#stat-tiles").innerHTML = `<div class="empty">${esc(e.message)}</div>`;
  }
}

function renderTiles({ overall, districts }) {
  const top = districts[0];
  const low = districts[districts.length - 1];
  const tiles = [
    ["Jami e'lonlar", overall.count ?? 0],
    ["O'rtacha narx", usd(overall.avg_price || 0)],
    ["O'rtacha $ / m²", usd(overall.avg_ppm || 0)],
    ["Eng qimmat tuman", top ? `${esc(top.district)}` : "—"],
    ["Eng arzon tuman", low ? `${esc(low.district)}` : "—"],
  ];
  $("#stat-tiles").innerHTML = tiles
    .map(([l, v]) => `<div class="tile"><div class="label">${l}</div><div class="value">${v}</div></div>`)
    .join("");
}

function renderDistrictChart(districts) {
  const max = Math.max(...districts.map((d) => d.max_ppm), 1);
  const pct = (v) => (v / max) * 100;
  $("#district-chart").innerHTML = districts
    .map(
      (d) => `
      <div class="bar-row" data-district="${esc(d.district)}" title="${esc(d.district)} e'lonlarini ko'rish">
        <span class="bar-name">${esc(d.district)} <span class="bar-sub">${d.count} ta e'lon</span></span>
        <div class="bar-track">
          <div class="bar-range" style="left:${pct(d.min_ppm)}%;width:${pct(d.max_ppm) - pct(d.min_ppm)}%"></div>
          <div class="bar-fill" style="width:${pct(d.avg_ppm)}%"></div>
        </div>
        <span class="bar-value">${usd(d.avg_ppm)}<span class="bar-sub">${usd(d.min_ppm)}–${usd(d.max_ppm)}</span></span>
      </div>`
    )
    .join("");
}

function renderRoomsTable(rows) {
  $("#rooms-table").innerHTML = `
    <thead><tr><th>Xonalar</th><th>E'lonlar</th><th>O'rtacha maydon</th><th>O'rtacha narx</th><th>O'rtacha $ / m²</th></tr></thead>
    <tbody>${rows
      .map(
        (r) => `<tr><td>${r.rooms >= 5 ? "5+" : r.rooms}</td><td>${r.count}</td><td>${r.avg_area} m²</td><td>${usd(r.avg_price)}</td><td>${usd(r.avg_ppm)}</td></tr>`
      )
      .join("")}</tbody>`;
}

// ---------- Yangi e'lon ----------
function updatePpmPreview() {
  const f = $("#add-form");
  const price = Number(f.price.value);
  const area = Number(f.area.value);
  $("#ppm-preview").textContent = price > 0 && area > 0 ? `Hisoblangan narx: ${usd(price / area)} / m²` : "";
}

async function onAddSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const msg = $("#form-message");
  form.querySelectorAll(".field-error").forEach((el) => el.remove());
  form.querySelectorAll(".invalid").forEach((el) => el.classList.remove("invalid"));

  const body = Object.fromEntries(new FormData(form));
  try {
    const created = await api("/api/listings", { method: "POST", body: JSON.stringify(body) });
    form.reset();
    updatePpmPreview();
    msg.className = "form-message ok";
    msg.textContent = `E'lon qo'shildi: ${created.title} — ${usd(created.price_per_m2)} / m²`;
    msg.hidden = false;
    loadListings();
  } catch (err) {
    msg.className = "form-message error";
    msg.textContent = err.message;
    msg.hidden = false;
    for (const [name, text] of Object.entries(err.fields || {})) {
      const input = form.elements[name];
      if (!input) continue;
      input.classList.add("invalid");
      input.insertAdjacentHTML("afterend", `<span class="field-error">${esc(text)}</span>`);
    }
  }
}

// ---------- Ishga tushirish ----------
async function init() {
  const meta = await api("/api/meta");
  const options = meta.districts.map((d) => `<option value="${esc(d)}">${esc(d)}</option>`).join("");
  $("#filters [name=district]").insertAdjacentHTML("beforeend", options);
  $("#add-form [name=district]").insertAdjacentHTML("beforeend", options);

  document.querySelectorAll(".tab").forEach((b) => b.addEventListener("click", () => showTab(b.dataset.tab)));

  const filters = $("#filters");
  filters.addEventListener("change", loadListings);
  filters.addEventListener("input", debounce(loadListings, 400));
  filters.addEventListener("reset", () => setTimeout(loadListings));
  filters.addEventListener("submit", (e) => e.preventDefault());

  $("#listings").addEventListener("click", onListingsClick);
  $("#compare-go").addEventListener("click", () => showTab("compare"));
  $("#compare-clear").addEventListener("click", () => {
    compareIds.clear();
    updateCompareBar();
    loadListings();
  });

  // Statistikadagi tuman ustiga bosilsa — shu tuman e'lonlari ochiladi
  $("#district-chart").addEventListener("click", (e) => {
    const row = e.target.closest(".bar-row");
    if (!row) return;
    filters.district.value = row.dataset.district;
    filters.sort.value = "ppm_asc";
    showTab("listings");
    loadListings();
  });

  const addForm = $("#add-form");
  addForm.addEventListener("submit", onAddSubmit);
  addForm.addEventListener("input", updatePpmPreview);

  loadListings();
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

init().catch((e) => {
  $("#listings").innerHTML = `<div class="empty">Serverga ulanib bo'lmadi: ${esc(e.message)}</div>`;
});
