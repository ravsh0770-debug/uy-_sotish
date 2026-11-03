// HomeFinder stress tests.
// Open index.html?stress in a browser to run them. Without "?stress" this file does nothing.
// The tests use their own storage ("homefinder.stress"), so your normal listings, votes and
// sign-up are not touched. Use "Remove test data" in the results panel when you are done.
(function () {
  "use strict";
  if (!/[?&]stress\b/.test(location.search)) return;

  const KEY = "homefinder.stress";
  window.HF_STORAGE_KEY = KEY;
  const T0 = performance.now();
  const errors = [];
  window.addEventListener("error", (e) => errors.push(String(e.message || e)));
  window.addEventListener("unhandledrejection", (e) => {
    const r = e.reason;
    errors.push("Unhandled promise: " + String((r && (r.message || r.code)) || r));
  });

  // ---------- Test data: 5,000 generated listings ----------
  let seed = 12345;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

  // Names must match the CITIES list in script.js.
  const PLACES = {
    Tashkent: ["Bektemir", "Chilonzor", "Mirobod", "Mirzo Ulug'bek", "Olmazor", "Sergeli", "Shayxontohur", "Uchtepa", "Yakkasaroy", "Yangihayot", "Yashnobod", "Yunusobod"],
    Samarkand: ["Samarkand city", "Urgut", "Kattaqo'rg'on"],
    Bukhara: ["Bukhara city", "Kogon", "G'ijduvon"],
    Fergana: ["Fergana city", "Quva", "Rishton"],
  };
  const HOUSES = ["House", "Villa", "Townhouse"];
  const N = 5000;

  function makeListing(i) {
    const city = pick(Object.keys(PLACES));
    const type = pick(["Apartment", "Apartment", "Studio", "Condo", "Loft", "House", "Villa", "Townhouse", "Office", "Shop"]);
    const house = HOUSES.includes(type);
    const storeys = house ? int(1, 3) : int(1, 25);
    const rent = rnd() < 0.35;
    const l = {
      id: "st" + i, title: type + " number " + i, type, building: rnd() < 0.5 ? "new" : "old",
      city, district: pick(PLACES[city]),
      price: rent ? int(20, 3000) : int(20000, 900000),
      rooms: int(1, 6), area: int(20, 600), storeys, floor: house ? null : int(1, storeys),
      createdAt: 1790000000000 - i * 60000, description: "Generated for stress testing.",
    };
    if (rent) { l.deal = "rent"; l.term = rnd() < 0.5 ? "short" : "long"; }
    return l;
  }
  const listings = Array.from({ length: N }, (_, i) => makeListing(i));

  let prevCurrency = null;
  try {
    prevCurrency = localStorage.getItem("homefinder.currency");
    localStorage.removeItem("homefinder.currency");
    localStorage.setItem(KEY, JSON.stringify({
      me: "local-stress",
      votes: {},
      sellers: {
        "stress-seller": { name: "Stress Seller", phone: "+998 71 000 00 00", listings },
        "local-stress": { name: "Stress Tester", firstName: "Stress", surname: "Tester", phone: "+998 90 000 00 00", listings: [] },
      },
    }));
  } catch (e) {
    errors.push("Could not save the test data in browser storage: " + e.message);
  }

  let loadMs = 0;
  document.addEventListener("DOMContentLoaded", () => { loadMs = performance.now() - T0; });

  // ---------- Helpers ----------
  const $ = (id) => document.getElementById(id);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const fire = (el, type) => el.dispatchEvent(new Event(type, { bubbles: true }));
  const counts = () => {
    const b = $("count").querySelectorAll("b");
    return { shown: Number(b[0] && b[0].textContent), total: Number(b[1] && b[1].textContent) };
  };
  const pct = (arr, p) => {
    const s = arr.slice().sort((a, b) => a - b);
    return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : 0;
  };
  const ms = (x) => x.toFixed(x < 10 ? 1 : 0) + " ms";
  async function waitFor(check, timeout) {
    const end = performance.now() + timeout;
    while (performance.now() < end) {
      if (check()) return true;
      await sleep(10);
    }
    return check();
  }
  const resetFilters = () => $("resetBtn").click();

  // Same filter rules as the site, written separately to check its answers.
  const range = (a, b) => {
    let x = a === "" ? null : Number(a), y = b === "" ? null : Number(b);
    if (x !== null && y !== null && x > y) [x, y] = [y, x];
    return { min: x, max: y, on: x !== null || y !== null };
  };
  function expectedCount(c) {
    const ar = range(c.areaMin, c.areaMax), st = range(c.stMin, c.stMax), fl = range(c.flMin, c.flMax);
    const floorOn = fl.on || c.notFirst || c.notTop;
    return listings.filter((l) => {
      if (c.city !== "all" && l.city !== c.city) return false;
      if (c.district !== "all" && l.district !== c.district) return false;
      if (c.building !== "any" && l.building !== c.building) return false;
      if (ar.min !== null && l.area < ar.min) return false;
      if (ar.max !== null && l.area > ar.max) return false;
      if (st.min !== null && l.storeys < st.min) return false;
      if (st.max !== null && l.storeys > st.max) return false;
      if (floorOn) {
        if (l.floor === null) return false;
        if (fl.min !== null && l.floor < fl.min) return false;
        if (fl.max !== null && l.floor > fl.max) return false;
        if (c.notFirst && l.floor <= 1) return false;
        if (c.notTop && l.floor >= l.storeys) return false;
      }
      return true;
    }).length;
  }

  // ---------- The five tests ----------

  // 1. Big data load: 5,000 listings rendered on first load, then one full re-sort.
  async function testLoad() {
    const cards = document.querySelectorAll("#grid .card").length;
    const t = performance.now();
    $("fSort").value = "price-asc";
    fire($("fSort"), "change");
    const resort = performance.now() - t;
    $("fSort").value = "new";
    fire($("fSort"), "change");
    const ok = cards === N && loadMs < 4000 && resort < 1500;
    return { ok, detail: `${cards} of ${N} listings shown. Page ready in ${ms(loadMs)} (limit 4000 ms). Re-sorting all of them took ${ms(resort)} (limit 1500 ms).` };
  }

  // 2. Filter hammering: 300 random filter combinations, each checked against an independent count.
  async function testFilters() {
    resetFilters();
    const times = [];
    let wrong = 0, firstWrong = "";
    for (let k = 0; k < 300; k++) {
      const city = rnd() < 0.3 ? "all" : pick(Object.keys(PLACES));
      const c = {
        city,
        district: city !== "all" && rnd() < 0.5 ? pick(PLACES[city]) : "all",
        building: pick(["any", "any", "new", "old"]),
        areaMin: rnd() < 0.4 ? String(int(20, 300)) : "", areaMax: rnd() < 0.4 ? String(int(50, 600)) : "",
        stMin: rnd() < 0.3 ? String(int(1, 10)) : "", stMax: rnd() < 0.3 ? String(int(5, 25)) : "",
        flMin: rnd() < 0.25 ? String(int(1, 8)) : "", flMax: rnd() < 0.25 ? String(int(3, 20)) : "",
        notFirst: rnd() < 0.2, notTop: rnd() < 0.2,
      };
      $("fCity").value = c.city;
      fire($("fCity"), "change"); // refills the district list
      $("fDistrict").value = c.district;
      $("fBuilding").value = c.building;
      $("fAreaMin").value = c.areaMin; $("fAreaMax").value = c.areaMax;
      $("fStoreysMin").value = c.stMin; $("fStoreysMax").value = c.stMax;
      $("fFloorMin").value = c.flMin; $("fFloorMax").value = c.flMax;
      $("fNotFirst").checked = c.notFirst; $("fNotTop").checked = c.notTop;
      const t = performance.now();
      fire($("fBuilding"), "change"); // one update with every filter applied
      times.push(performance.now() - t);
      const got = counts().shown, want = expectedCount(c);
      if (got !== want) {
        wrong++;
        if (!firstWrong) firstWrong = ` First wrong result: showed ${got}, expected ${want} for ${JSON.stringify(c)}.`;
      }
      if (k % 25 === 0) await sleep(0);
    }
    resetFilters();
    const p95 = pct(times, 0.95);
    return {
      ok: wrong === 0 && p95 < 800,
      detail: `300 combinations, ${wrong} wrong counts. Update time: median ${ms(pct(times, 0.5))}, slowest 5% ${ms(p95)} (limit 800 ms).${firstWrong}`,
    };
  }

  // 3. Vote storm: 500 rapid like/dislike clicks, then compare the buttons with what was saved.
  async function testVotes() {
    resetFilters();
    const CLICKS = 500, times = [];
    for (let k = 0; k < CLICKS; k++) {
      const buttons = document.querySelectorAll("#grid .vote");
      const b = buttons[int(0, Math.min(buttons.length, 400) - 1)];
      const t = performance.now();
      b.click();
      times.push(performance.now() - t);
      if (k % 50 === 0) await sleep(0);
    }
    await sleep(300);
    const saved = (JSON.parse(localStorage.getItem(KEY)).votes || {})["local-stress"];
    const map = (saved && saved.v) || {};
    let outOfSync = 0;
    document.querySelectorAll("#grid .votes[data-key]").forEach((el) => {
      const v = map[el.dataset.key] || 0;
      const up = el.querySelector(".vote.up").getAttribute("aria-pressed") === "true";
      const down = el.querySelector(".vote.down").getAttribute("aria-pressed") === "true";
      if ((v === 1) !== up || (v === -1) !== down) outOfSync++;
    });
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    return {
      ok: outOfSync === 0 && avg < 40,
      detail: `${CLICKS} clicks on ${Object.keys(map).length} listings. ${outOfSync} buttons disagree with the saved votes. Average ${ms(avg)} per click (limit 40 ms).`,
    };
  }

  // 4. Post flood: 50 listings through the real form, including hostile and oversized text.
  async function testPosts() {
    resetFilters();
    window.__hfXss = 0;
    const hostile = [
      '<img src=x onerror="window.__hfXss=1">',
      '"><script>window.__hfXss=1<\/script>',
      "Robert'); DROP TABLE listings;--",
      "😀".repeat(30),
      "A".repeat(500),
    ];
    const POSTS = 50, times = [];
    const before = counts().total;
    let lost = 0;
    for (let k = 0; k < POSTS; k++) {
      const title = k < hostile.length ? hostile[k] : "Stress post " + k;
      $("pDeal").value = "sale"; fire($("pDeal"), "change");
      $("pType").value = "Apartment"; fire($("pType"), "change");
      $("pCity").value = "Tashkent"; fire($("pCity"), "change");
      $("pDistrict").value = "Chilonzor";
      $("pBuilding").value = "new";
      $("pCurrency").value = "USD"; fire($("pCurrency"), "change");
      $("pTitle").value = title;
      $("pPrice").value = String(50000 + k);
      $("pArea").value = "60"; $("pRooms").value = "2"; $("pStoreys").value = "9"; $("pFloor").value = "3";
      $("pDesc").value = title;
      const t = performance.now();
      $("postForm").requestSubmit();
      const saved = await waitFor(() => counts().total === before + k + 1, 4000);
      times.push(performance.now() - t);
      if (!saved) { lost++; break; }
    }
    const after = counts().total;
    const titles = Array.from(document.querySelectorAll("#grid .card h3")).map((h) => h.textContent);
    const shownAsText = hostile.slice(0, 3).every((h) => titles.includes(h));
    const injected = window.__hfXss === 1 || !!document.querySelector("#grid h3 img, #grid h3 script");
    const formError = $("postError").hidden ? "" : ` Form said: "${$("postError").textContent}".`;
    const p95 = pct(times, 0.95);
    return {
      ok: lost === 0 && after === before + POSTS && shownAsText && !injected && p95 < 1500,
      detail: `${after - before} of ${POSTS} posts saved.${formError} Hostile titles shown as plain text: ${shownAsText ? "yes" : "no"}. Injected code ran: ${injected ? "YES" : "no"}. Save time: median ${ms(pct(times, 0.5))}, slowest 5% ${ms(p95)} (limit 1500 ms).`,
    };
  }

  // 5. Navigation churn: switch sections and currency, open and close listings, then look for leaks and errors.
  async function testChurn() {
    resetFilters();
    document.querySelector('#sidebar [data-deal="all"]').click();
    $("detailBody").innerHTML = "";
    const nodesBefore = document.getElementsByTagName("*").length;
    const errorsBefore = errors.length;
    const sections = Array.from(document.querySelectorAll("#sidebar [data-deal]"));
    const CYCLES = 200, times = [];
    for (let k = 0; k < CYCLES; k++) {
      const t = performance.now();
      pick(sections).click();
      if (k % 3 === 0) $("currencySwitch").querySelector(`[data-currency="${k % 2 ? "UZS" : "USD"}"]`).click();
      const cards = document.querySelectorAll("#grid .card");
      if (cards.length) {
        cards[int(0, Math.min(cards.length, 50) - 1)].click();
        $("detailDialog").close();
      }
      times.push(performance.now() - t);
      if (k % 20 === 0) await sleep(0);
    }
    document.querySelector('#sidebar [data-deal="all"]').click();
    $("currencySwitch").querySelector('[data-currency="USD"]').click();
    await sleep(300);
    $("detailBody").innerHTML = "";
    const drift = document.getElementsByTagName("*").length - nodesBefore;
    const newErrors = errors.slice(errorsBefore);
    const p95 = pct(times, 0.95);
    return {
      ok: Math.abs(drift) < 50 && newErrors.length === 0 && p95 < 1500,
      detail: `${CYCLES} cycles. Page elements before/after: ${nodesBefore} / ${nodesBefore + drift} (allowed difference 50). Errors: ${newErrors.length ? newErrors.slice(0, 3).join(" | ") : "none"}. Cycle time: median ${ms(pct(times, 0.5))}, slowest 5% ${ms(p95)} (limit 1500 ms).`,
    };
  }

  const TESTS = [
    ["1. Big data load", testLoad],
    ["2. Filter hammering", testFilters],
    ["3. Vote storm", testVotes],
    ["4. Post flood", testPosts],
    ["5. Navigation churn", testChurn],
  ];

  // ---------- Results panel ----------
  function panel() {
    const style = document.createElement("style");
    style.textContent = `
      #stressPanel { position: fixed; right: max(16px, env(safe-area-inset-right, 0px)); bottom: calc(16px + env(safe-area-inset-bottom, 0px)); z-index: 100;
        width: min(460px, calc(100vw - 32px)); max-height: 80vh; overflow: auto; background: var(--surface, #fff); color: var(--ink, #111);
        border-radius: 18px; box-shadow: 0 30px 80px rgba(0,0,0,.45); padding: 18px; font: 500 14px/1.45 var(--body, system-ui); border-top: 4px solid var(--accent, #1f6bff); }
      #stressPanel h2 { margin: 0 0 4px; font: 700 1.1rem var(--display, system-ui); }
      #stressPanel ol { list-style: none; margin: 12px 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
      #stressPanel li { background: var(--surface-2, #eee); border-radius: 12px; padding: 10px 12px; }
      #stressPanel .row { display: flex; justify-content: space-between; gap: 8px; font-weight: 800; }
      #stressPanel .st { font-size: .75rem; padding: 2px 10px; border-radius: 99px; background: var(--line, #ccc); }
      #stressPanel .pass { background: #1a7f37; color: #fff; } #stressPanel .fail { background: var(--hot, #d00); color: #fff; }
      #stressPanel .d { margin: 4px 0 0; color: var(--muted, #555); font-size: .85rem; overflow-wrap: anywhere; }
      #stressPanel .actions { display: flex; flex-wrap: wrap; gap: 8px; }
      #stressPanel button { font: 700 .9rem var(--body, system-ui); border-radius: 99px; padding: 8px 14px; border: 0; cursor: pointer; background: var(--accent, #1f6bff); color: #fff; }
      #stressPanel button.alt { background: var(--surface-2, #eee); color: var(--ink, #111); }`;
    document.head.appendChild(style);
    const p = document.createElement("section");
    p.id = "stressPanel";
    p.setAttribute("aria-live", "polite");
    p.innerHTML = `<h2>Stress tests</h2><p class="d" id="stressSummary">Running on ${N} test listings…</p>
      <ol>${TESTS.map(([name], i) => `<li><div class="row"><span>${name}</span><span class="st" id="st${i}">waiting</span></div><p class="d" id="sd${i}"></p></li>`).join("")}</ol>
      <div class="actions"><button type="button" id="stressAgain">Run again</button><button type="button" class="alt" id="stressClean">Remove test data</button></div>
      <pre id="stressResults" hidden></pre>`;
    document.body.appendChild(p);
    $("stressAgain").addEventListener("click", () => location.reload());
    $("stressClean").addEventListener("click", () => {
      try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
      location.href = location.pathname;
    });
  }

  async function run() {
    panel();
    const results = [];
    for (let i = 0; i < TESTS.length; i++) {
      const [name, fn] = TESTS[i];
      $("st" + i).textContent = "running";
      await sleep(30);
      const t = performance.now();
      let r;
      try { r = await fn(); } catch (e) { r = { ok: false, detail: "The test itself crashed: " + (e && e.message) }; }
      r.name = name;
      r.seconds = +((performance.now() - t) / 1000).toFixed(1);
      results.push(r);
      $("st" + i).textContent = r.ok ? "pass" : "fail";
      $("st" + i).className = "st " + (r.ok ? "pass" : "fail");
      $("sd" + i).textContent = `${r.detail} (${r.seconds} s)`;
    }
    const passed = results.filter((r) => r.ok).length;
    $("stressSummary").textContent = `${passed} of ${results.length} passed. Errors caught on the page: ${errors.length}.`;
    $("stressResults").textContent = JSON.stringify({ passed, total: results.length, errors, results });
    document.title = `Stress tests: ${passed}/${results.length} passed`;
    console.table(results.map(({ name, ok, seconds, detail }) => ({ name, ok, seconds, detail })));
    try {
      if (prevCurrency === null) localStorage.removeItem("homefinder.currency");
      else localStorage.setItem("homefinder.currency", prevCurrency);
    } catch (e) { /* ignore */ }
  }

  window.addEventListener("load", () => setTimeout(run, 300));
})();
