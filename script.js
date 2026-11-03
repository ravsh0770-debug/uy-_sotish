// HomeFinder: listings, buyer filters, seller sign-up and posting.
// Published on claude.ai, data is kept in the page's shared database so every visitor sees the same listings.
// Opened as a local file, data is kept in this browser's localStorage.
(function () {
  "use strict";

  // Cities of Uzbekistan and their districts. Tashkent uses its city districts;
  // other cities list the city itself followed by the districts (tumans) of its region.
  const CITIES = {
    "Tashkent": ["Bektemir", "Chilonzor", "Mirobod", "Mirzo Ulug'bek", "Olmazor", "Sergeli", "Shayxontohur", "Uchtepa", "Yakkasaroy", "Yangihayot", "Yashnobod", "Yunusobod"],
    "Samarkand": ["Samarkand city", "Bulung'ur", "Ishtixon", "Jomboy", "Kattaqo'rg'on", "Narpay", "Nurobod", "Oqdaryo", "Pastdarg'om", "Paxtachi", "Payariq", "Qo'shrabot", "Samarqand district", "Toyloq", "Urgut"],
    "Bukhara": ["Bukhara city", "Buxoro district", "G'ijduvon", "Jondor", "Kogon", "Olot", "Peshku", "Qorako'l", "Qorovulbozor", "Romitan", "Shofirkon", "Vobkent"],
    "Andijan": ["Andijan city", "Andijon district", "Asaka", "Baliqchi", "Bo'ston", "Buloqboshi", "Izboskan", "Jalaquduq", "Marhamat", "Oltinko'l", "Paxtaobod", "Qo'rg'ontepa", "Shahrixon", "Ulug'nor", "Xo'jaobod"],
    "Namangan": ["Namangan city", "Chortoq", "Chust", "Kosonsoy", "Mingbuloq", "Namangan district", "Norin", "Pop", "To'raqo'rg'on", "Uchqo'rg'on", "Uychi", "Yangiqo'rg'on"],
    "Fergana": ["Fergana city", "Bag'dod", "Beshariq", "Buvayda", "Dang'ara", "Farg'ona district", "Furqat", "Oltiariq", "O'zbekiston", "Qo'shtepa", "Quva", "Rishton", "So'x", "Toshloq", "Uchko'prik", "Yozyovon"],
    "Karshi": ["Karshi city", "Chiroqchi", "Dehqonobod", "G'uzor", "Kasbi", "Kitob", "Ko'kdala", "Koson", "Mirishkor", "Muborak", "Nishon", "Qamashi", "Qarshi district", "Shahrisabz", "Yakkabog'"],
    "Navoi": ["Navoi city", "Karmana", "Konimex", "Navbahor", "Nurota", "Qiziltepa", "Tomdi", "Uchquduq", "Xatirchi"],
    "Termez": ["Termez city", "Angor", "Bandixon", "Boysun", "Denov", "Jarqo'rg'on", "Muzrabot", "Oltinsoy", "Qiziriq", "Qumqo'rg'on", "Sariosiyo", "Sherobod", "Sho'rchi", "Termiz district", "Uzun"],
    "Urgench": ["Urgench city", "Bog'ot", "Gurlan", "Hazorasp", "Xiva", "Xonqa", "Qo'shko'pir", "Shovot", "Tuproqqal'a", "Urganch district", "Yangiariq", "Yangibozor"],
    "Jizzakh": ["Jizzakh city", "Arnasoy", "Baxmal", "Do'stlik", "Forish", "G'allaorol", "Mirzacho'l", "Paxtakor", "Sharof Rashidov", "Yangiobod", "Zafarobod", "Zarbdor", "Zomin"],
  };
  const CITY_NAMES = Object.keys(CITIES);
  const TYPES = ["Apartment", "Studio", "Loft", "Condo", "Penthouse", "House", "Townhouse", "Villa", "Office", "Shop", "Warehouse"];
  const HOUSE_TYPES = ["House", "Townhouse", "Villa"];
  const COMMERCIAL_TYPES = ["Office", "Shop", "Warehouse"];
  const categoryOf = (type) => (HOUSE_TYPES.includes(type) ? "house" : COMMERCIAL_TYPES.includes(type) ? "commercial" : "apartment");
  const VIEW_TITLES = {
    "all|": "All listings", "sale|": "For sale", "sale|apartment": "Apartments for sale", "sale|house": "Houses for sale",
    "sale|commercial": "Commercial property for sale", "rent|": "For rent", "rent|short": "Short-term rentals", "rent|long": "Long-term rentals",
  };
  const TILE_COLORS = ["#2c4470", "#1f6070", "#8a4f36", "#2f5d4c", "#4d4577", "#6b2d4a", "#24507a", "#5a4a2a", "#1d5a5a", "#3a3f7a", "#7a3a3a"];
  const cityColor = (city) => TILE_COLORS[Math.max(0, CITY_NAMES.indexOf(city)) % TILE_COLORS.length];

  const ICON_FLAT = '<svg viewBox="0 0 100 100" fill="none" stroke="rgba(255,255,255,.9)" stroke-width="3" aria-hidden="true"><rect x="25" y="10" width="50" height="85" fill="rgba(255,255,255,.08)"/><g fill="rgba(255,255,255,.55)" stroke="none"><rect x="33" y="20" width="10" height="10"/><rect x="57" y="20" width="10" height="10"/><rect x="33" y="40" width="10" height="10"/><rect x="57" y="40" width="10" height="10"/><rect x="33" y="60" width="10" height="10"/><rect x="57" y="60" width="10" height="10"/></g><rect x="44" y="78" width="12" height="17"/></svg>';
  const ICON_HOUSE = '<svg viewBox="0 0 100 100" fill="none" stroke="rgba(255,255,255,.9)" stroke-width="3" aria-hidden="true"><path d="M10 48 L50 14 L90 48"/><rect x="20" y="44" width="60" height="50" fill="rgba(255,255,255,.08)"/><g fill="rgba(255,255,255,.55)" stroke="none"><rect x="28" y="54" width="14" height="12"/><rect x="58" y="54" width="14" height="12"/></g><rect x="43" y="72" width="14" height="22"/></svg>';

  const ICON_SHOP = '<svg viewBox="0 0 100 100" fill="none" stroke="rgba(255,255,255,.9)" stroke-width="3" aria-hidden="true"><rect x="14" y="40" width="72" height="54" fill="rgba(255,255,255,.08)"/><path d="M10 40 L18 16 H82 L90 40 Z" fill="rgba(255,255,255,.18)"/><rect x="22" y="52" width="32" height="24" fill="rgba(255,255,255,.55)" stroke="none"/><rect x="62" y="52" width="16" height="42"/></svg>';

  const ICON_THUMB = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 10h4v11H2zM8 21h9.3a2 2 0 0 0 2-1.6l1.6-7.4A2 2 0 0 0 19 9.5h-5.5V5.2A2.2 2.2 0 0 0 11.3 3L8 10z"/></svg>';

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  // ---------- Currency ----------
  // Prices are stored in US dollars and converted for display.
  // Update this rate when it changes (so'm per 1 US dollar).
  const UZS_PER_USD = 12700;
  let currency = "USD";
  try { if (localStorage.getItem("homefinder.currency") === "UZS") currency = "UZS"; } catch (e) { /* no storage */ }
  const toCur = (usd) => (currency === "UZS" ? usd * UZS_PER_USD : usd);
  const trimNum = (x) => +x.toFixed(x < 10 ? 2 : x < 100 ? 1 : 0);
  const groupSpaces = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  // Full amount, or a short form for cards ("1.13 mlrd so'm", "698 mln so'm").
  function fmtMoney(usd, compact) {
    if (currency === "USD") return money.format(usd);
    const v = usd * UZS_PER_USD;
    if (compact && v >= 1e9) return trimNum(v / 1e9) + " mlrd so'm";
    if (compact && v >= 1e6) return trimNum(v / 1e6) + " mln so'm";
    return groupSpaces(v) + " so'm";
  }
  const isHouseType = (type) => HOUSE_TYPES.includes(type);
  const clone = (o) => JSON.parse(JSON.stringify(o || {}));
  const numOrNull = (v) => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
  const inputNum = (el) => numOrNull(el.value.trim());

  let store = null;      // storage adapter (shared database or localStorage)
  let sellers = {};      // sellerId -> { name, phone, email, listings: [] }
  let loaded = false;
  let busy = false;
  let openPostAfterSignup = false;
  let pickedPhoto = null; // File chosen in the post form
  let byKey = new Map();
  let view = { deal: "all", sub: "" }; // sidebar choice: all | sale (+apartment/house/commercial) | rent (+short/long)

  // ---------- Image helpers ----------
  function readAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(new Error("read"));
      r.readAsDataURL(file);
    });
  }
  async function shrink(file, maxSide) {
    const src = await readAsDataUrl(file);
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("image"));
      i.src = src;
    });
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    return c;
  }

  // ---------- Storage adapters ----------
  function localStore() {
    // The stress tests (index.html?stress) use their own storage so real data is untouched.
    const KEY = window.HF_STORAGE_KEY || "homefinder.v6";
    let data = null;
    try { data = JSON.parse(localStorage.getItem(KEY)); } catch (e) { /* no storage */ }
    if (!data || typeof data !== "object") {
      data = { me: "local-" + Math.random().toString(36).slice(2, 10), sellers: clone(window.SAMPLE_SELLERS || {}) };
    }
    if (!data.votes) data.votes = {};
    const persist = () => localStorage.setItem(KEY, JSON.stringify(data));
    try { persist(); } catch (e) { /* storage unavailable: data lives for this visit */ }
    let listener = null, voteListener = null;
    return {
      myId: data.me,
      isOwner: true,
      canPhoto: true,
      subscribe(cb) { listener = cb; cb(data.sellers); },
      subscribeVotes(cb) { voteListener = cb; cb(data.votes); },
      async saveMine(doc) {
        const prev = data.votes[data.me];
        data.votes[data.me] = doc;
        try { persist(); } catch (e) {
          data.votes[data.me] = prev;
          throw { code: "storage_full" };
        }
        if (voteListener) voteListener(data.votes);
      },
      async saveSeller(id, doc) {
        const prev = data.sellers[id];
        data.sellers[id] = doc;
        try { persist(); } catch (e) {
          data.sellers[id] = prev;
          throw { code: "storage_full" };
        }
        if (listener) listener(data.sellers);
      },
      async uploadPhoto(file) {
        const canvas = await shrink(file, 900);
        return canvas.toDataURL("image/jpeg", 0.75);
      },
      photoUrl(ref) { return typeof ref === "string" && ref.startsWith("data:image/") ? ref : null; },
    };
  }

  async function dbStore(db, user, assets) {
    const myId = user ? await user.id() : null;
    const owner = user ? await user.isOwner() : false;
    return {
      myId,
      isOwner: owner,
      canPhoto: !!assets,
      subscribe(cb) {
        db.collection("sellers").onSnapshot(
          (snap) => {
            const out = {};
            snap.docs.forEach((d) => { if (d.exists) out[d.id] = d.data(); });
            cb(out);
          },
          () => toast("Live updates stopped. Reload the page to see new listings.")
        );
      },
      async saveSeller(id, doc) { await db.doc("sellers/" + id).set(doc); },
      // One document per person: votes/<their id> = { v: { listingKey: 1 (like) | -1 (dislike) }, seen: { listingKey: 1 } }
      subscribeVotes(cb) {
        db.collection("votes").onSnapshot(
          (snap) => {
            const out = {};
            snap.docs.forEach((d) => { if (d.exists) out[d.id] = d.data(); });
            cb(out);
          },
          () => {}
        );
      },
      async saveMine(doc) { await db.doc("votes/" + myId).set(doc); },
      async uploadPhoto(file) {
        const canvas = await shrink(file, 1400);
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
        const res = await assets.upload(blob, { type: "image/jpeg" });
        return res.id;
      },
      photoUrl(ref) { return typeof ref === "string" && /^[A-Za-z0-9_-]{8,64}$/.test(ref) ? "/_blob/" + ref : null; },
    };
  }

  function errorMessage(e) {
    const code = e && e.code;
    if (code === "invalid_argument" || code === "not_granted") return "You can view this page but not post on it. Ask the owner to give you Contributor access.";
    if (code === "quota_exceeded" || code === "quota_or_state") return "The site is out of storage space. Remove an old listing and try again.";
    if (code === "storage_full") return "Your browser's storage is full. Try a smaller photo, or remove an old listing.";
    if (code === "too_large") return "That photo is too large. Pick one under 20 MB.";
    if (code === "unsupported_type") return "That file type is not supported. Use a JPG, PNG or WebP photo.";
    if (code === "rate_limited" || code === "resource_exhausted") return "Too many requests. Wait a few seconds and try again.";
    return "Something went wrong while saving. Check your connection and try again.";
  }

  // ---------- Data ----------
  function normalize(l, sellerId, s) {
    if (!l || typeof l !== "object") return null;
    const out = {
      key: sellerId + "|" + String(l.id || ""),
      id: String(l.id || ""),
      title: String(l.title || "Untitled listing"),
      type: TYPES.includes(l.type) ? l.type : "Apartment",
      city: String(l.city || ""),
      district: String(l.district || ""),
      building: l.building === "new" || l.building === "old" ? l.building : "",
      price: numOrNull(l.price),
      rooms: numOrNull(l.rooms),
      area: numOrNull(l.area),
      storeys: numOrNull(l.storeys),
      floor: numOrNull(l.floor),
      description: String(l.description || ""),
      photo: l.photo || null,
      createdAt: numOrNull(l.createdAt) || 0,
      sellerId,
      sellerName: String(s.name || "Seller"),
      phone: String(s.phone || ""),
      email: s.email ? String(s.email) : "",
      example: !!s.example,
      deal: l.deal === "rent" ? "rent" : "sale",
      term: l.term === "short" ? "short" : "long",
    };
    out.category = categoryOf(out.type);
    if (out.price === null) return null;
    if (isHouseType(out.type)) out.floor = null;
    return out;
  }

  function allListings() {
    const out = [];
    Object.keys(sellers).forEach((sid) => {
      const s = sellers[sid];
      if (!s || !Array.isArray(s.listings)) return;
      s.listings.forEach((l) => { const n = normalize(l, sid, s); if (n) out.push(n); });
    });
    return out;
  }

  const me = () => (store && store.myId ? sellers[store.myId] || null : null);
  const canManage = (l) => store && (l.sellerId === store.myId || store.isOwner);

  // ---------- Likes and dislikes ----------
  let votes = {};      // personId -> { v: { listingKey: 1 | -1 }, seen: { listingKey: 1 } }
  let myVotes = {};    // this visitor's own choices, shown instantly before they are saved
  let mySeen = {};     // listings this visitor has opened
  let voteSaving = false, voteDirty = false;
  let cannotWrite = false, lastWasVote = false;

  const ICON_EYE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5C6.5 5 2.7 9.3 1.5 12c1.2 2.7 5 7 10.5 7s9.3-4.3 10.5-7C21.3 9.3 17.5 5 12 5zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm0-2.2a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6z"/></svg>';

  const ICON_PHONE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25c1.1.37 2.3.57 3.6.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z"/></svg>';
  // Call button: shows only "Call" until pressed, then shows the owner's number and dials on the next press.
  const revealed = new Set(); // listings whose number this visitor has revealed
  function callHTML(l, big) {
    if (!l.phone) return "";
    const cls = "call" + (big ? " call-big" : "");
    if (!revealed.has(l.key)) {
      return `<button type="button" class="${cls}" data-reveal="${esc(l.key)}" aria-label="Show phone number of ${esc(l.sellerName)}">${ICON_PHONE}<span>Call</span></button>`;
    }
    const tel = l.phone.replace(/[^\d+]/g, "");
    return `<a class="${cls}" href="tel:${esc(tel)}" aria-label="Call ${esc(l.sellerName)} on ${esc(l.phone)}">${ICON_PHONE}<span>Call ${esc(l.phone)}</span></a>`;
  }
  function revealPhone(btn) {
    const l = byKey.get(btn.dataset.reveal);
    if (!l) return;
    revealed.add(l.key);
    // Update every Call button for this listing (card and details window).
    document.querySelectorAll(".call[data-reveal]").forEach((b) => {
      if (b.dataset.reveal !== l.key) return;
      const wasClicked = b === btn;
      b.insertAdjacentHTML("afterend", callHTML(l, b.classList.contains("call-big")));
      const link = b.nextElementSibling;
      b.remove();
      if (wasClicked && link) link.focus();
    });
  }

  // Number of different people who opened this listing.
  function viewCount(key) {
    let n = 0;
    Object.keys(votes).forEach((uid) => {
      if (store && uid === store.myId) return;
      if (votes[uid] && votes[uid].seen && votes[uid].seen[key]) n++;
    });
    return n + (mySeen[key] ? 1 : 0);
  }
  const viewsLabel = (n) => `${n} ${n === 1 ? "person" : "people"} viewed`;

  function recordView(l) {
    if (!store || !store.myId || cannotWrite) return;
    if (l.sellerId === store.myId || mySeen[l.key]) return; // sellers' own visits don't count
    mySeen = Object.assign({}, mySeen, { [l.key]: 1 });
    lastWasVote = false;
    paintVotes();
    saveVotes();
  }

  function tally(key) {
    let up = 0, down = 0;
    Object.keys(votes).forEach((uid) => {
      if (store && uid === store.myId) return;
      const v = votes[uid] && votes[uid].v ? votes[uid].v[key] : 0;
      if (v === 1) up++;
      else if (v === -1) down++;
    });
    const mine = myVotes[key] === 1 ? 1 : myVotes[key] === -1 ? -1 : 0;
    if (mine === 1) up++;
    if (mine === -1) down++;
    return { up, down, mine };
  }
  const score = (key) => { const t = tally(key); return t.up - t.down; };

  function votesHTML(key) {
    const t = tally(key);
    return `<button type="button" class="vote up" data-vote="1" aria-pressed="${t.mine === 1}" aria-label="Like, ${t.up}">${ICON_THUMB}<span>${t.up}</span></button>
      <button type="button" class="vote down" data-vote="-1" aria-pressed="${t.mine === -1}" aria-label="Dislike, ${t.down}">${ICON_THUMB}<span>${t.down}</span></button>
      <span class="views" title="${viewsLabel(viewCount(key))}">${ICON_EYE}<span>${viewCount(key)}</span></span>`;
  }

  // Update counts in place so keyboard focus stays on the button.
  function paintVotes() {
    document.querySelectorAll(".votes[data-key]").forEach((el) => {
      const t = tally(el.dataset.key);
      const [up, down] = el.querySelectorAll(".vote");
      if (!up || !down) return;
      up.setAttribute("aria-pressed", String(t.mine === 1));
      up.setAttribute("aria-label", `Like, ${t.up}`);
      up.querySelector("span").textContent = t.up;
      down.setAttribute("aria-pressed", String(t.mine === -1));
      down.setAttribute("aria-label", `Dislike, ${t.down}`);
      down.querySelector("span").textContent = t.down;
      const views = el.querySelector(".views");
      if (views) {
        const n = viewCount(el.dataset.key);
        views.title = viewsLabel(n);
        views.querySelector("span").textContent = n;
      }
    });
    const dv = $("detailViews");
    if (dv && dv.dataset.key) dv.textContent = viewsLabel(viewCount(dv.dataset.key));
  }

  function castVote(key, value) {
    // Anyone can vote; sign-up is only for owners who post listings.
    if (!store || !store.myId) {
      toast("Sign in to claude.ai to like or dislike listings.");
      return;
    }
    myVotes = Object.assign({}, myVotes);
    if (myVotes[key] === value) delete myVotes[key]; // clicking again takes the vote back
    else myVotes[key] = value;
    lastWasVote = true;
    paintVotes();
    saveVotes();
  }

  // One save at a time; clicks made during a save are sent together right after it.
  async function saveVotes() {
    if (voteSaving) { voteDirty = true; return; }
    voteSaving = true;
    try {
      do {
        voteDirty = false;
        await store.saveMine({ v: clone(myVotes), seen: clone(mySeen) });
      } while (voteDirty);
    } catch (err) {
      if (err && (err.code === "invalid_argument" || err.code === "not_granted")) cannotWrite = true;
      if (lastWasVote) toast(errorMessage(err)); // a view that can't be recorded fails quietly
      const mine = votes[store.myId];
      myVotes = mine && mine.v ? clone(mine.v) : {};
      mySeen = mine && mine.seen ? clone(mine.seen) : {};
      voteDirty = false;
      paintVotes();
    } finally {
      voteSaving = false;
    }
  }

  // ---------- Filters ----------
  const f = {
    city: $("fCity"), district: $("fDistrict"), building: $("fBuilding"), areaMin: $("fAreaMin"), areaMax: $("fAreaMax"), notFirst: $("fNotFirst"), notTop: $("fNotTop"), sort: $("fSort"),
    storeysMin: $("fStoreysMin"), storeysMax: $("fStoreysMax"), floorMin: $("fFloorMin"), floorMax: $("fFloorMax"),
    search: $("fSearch"),
  };
  // Search text: every word must appear in the title, city, district, type or description.
  const searchWords = () => f.search.value.toLowerCase().split(/\s+/).filter(Boolean);
  const matchesSearch = (l, words) => {
    if (!words.length) return true;
    const text = [l.title, l.city, l.district, l.type, l.description].join(" ").toLowerCase();
    return words.every((w) => text.includes(w));
  };
  // A From/To pair of number boxes; if From is bigger than To, the two are swapped.
  function numberRange(minEl, maxEl) {
    let a = inputNum(minEl), b = inputNum(maxEl);
    if (a !== null && b !== null && a > b) [a, b] = [b, a];
    return { min: a, max: b, on: a !== null || b !== null };
  }

  function inView(l, deal, sub) {
    if (deal !== "all" && l.deal !== deal) return false;
    if (sub && sub !== (l.deal === "rent" ? l.term : l.category)) return false;
    return true;
  }

  // Short labels for slider values that are already in the chosen currency.
  const compactMoney = (v) => {
    if (currency === "USD") return v >= 1e6 ? "$" + +(v / 1e6).toFixed(2) + "M" : v >= 1e3 ? "$" + +(v / 1e3).toFixed(1) + "K" : "$" + v;
    const n = v >= 1e9 ? trimNum(v / 1e9) + " mlrd" : v >= 1e6 ? trimNum(v / 1e6) + " mln" : v >= 1e3 ? trimNum(v / 1e3) + " ming" : v;
    return n + " so'm";
  };
  const oneTo = (n) => Array.from({ length: n }, (_, i) => i + 1);

  // Price steps that grow with the price (…, $100K, $150K, $200K, $250K…), covering the listings in view.
  function niceStops(values) {
    if (!values.length) return [0];
    const lo = Math.max(1, Math.min(...values)), hi = Math.max(...values);
    const M = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 7.5];
    const all = [];
    for (let e = Math.floor(Math.log10(lo)); e <= Math.ceil(Math.log10(hi)) + 1; e++) M.forEach((m) => all.push(Math.round(m * Math.pow(10, e))));
    let a = 0;
    while (a + 1 < all.length && all[a + 1] <= lo) a++;
    let b = all.length - 1;
    while (b - 1 >= 0 && all[b - 1] >= hi) b--;
    return all.slice(a, b + 1);
  }

  // Two-handle slider. Handles at the far ends mean "no limit", like an age-range picker.
  function dualRange(key, describe) {
    const lo = $(key + "Lo"), hi = $(key + "Hi"), fill = $(key + "Fill"), out = $(key + "Value");
    const d = {
      stops: [0],
      last() { return this.stops.length - 1; },
      range() {
        const n = this.last(), a = +lo.value, b = +hi.value;
        return { min: a > 0 ? this.stops[a] : null, max: b < n ? this.stops[b] : null };
      },
      active() { const r = this.range(); return r.min !== null || r.max !== null; },
      setStops(stops, keep) {
        const prev = keep ? this.range() : { min: null, max: null };
        this.stops = stops.length ? stops : [0];
        const n = this.last();
        [lo, hi].forEach((i) => { i.min = 0; i.max = n; i.step = 1; i.disabled = n < 1; });
        let a = 0, b = n;
        if (prev.min !== null) { a = this.stops.findIndex((s) => s >= prev.min); if (a < 0) a = n; }
        if (prev.max !== null) { const r = this.stops.slice().reverse().findIndex((s) => s <= prev.max); b = r < 0 ? 0 : n - r; }
        if (a > b) a = b;
        lo.value = a;
        hi.value = b;
        this.paint();
      },
      reset() { lo.value = 0; hi.value = this.last(); this.paint(); },
      paint() {
        const n = Math.max(1, this.last()), a = +lo.value, b = +hi.value;
        fill.style.left = (a / n) * 100 + "%";
        fill.style.right = 100 - (b / n) * 100 + "%";
        lo.classList.toggle("on-top", a > n / 2); // keep the left handle grabbable when both sit at the right end
        const text = describe(this.range(), this.stops);
        out.textContent = text;
        lo.setAttribute("aria-valuetext", text);
        hi.setAttribute("aria-valuetext", text);
      },
    };
    lo.addEventListener("input", () => { if (+lo.value > +hi.value) lo.value = hi.value; d.paint(); render(); });
    hi.addEventListener("input", () => { if (+hi.value < +lo.value) hi.value = lo.value; d.paint(); render(); });
    return d;
  }

  const unitNow = () => (view.deal === "rent" ? (view.sub === "short" ? " /night" : view.sub === "long" ? " /month" : "") : "");
  const priceR = dualRange("price", (r, s) => {
    if (r.min === null && r.max === null) return "Any price";
    const from = compactMoney(r.min === null ? s[0] : r.min);
    const to = r.max === null ? compactMoney(s[s.length - 1]) + "+" : compactMoney(r.max);
    return `${from} – ${to}${unitNow()}`;
  });
  // Fit the price slider to the listings in the current section.
  function rebuildSliders(keepPrice) {
    const inSec = allListings().filter((l) => inView(l, view.deal, view.sub));
    priceR.setStops(niceStops(inSec.map((l) => toCur(l.price))), keepPrice);
  }

  function activeFilterCount() {
    const floorOn = numberRange(f.floorMin, f.floorMax).on || f.notFirst.checked || f.notTop.checked;
    return [f.city.value !== "all" || f.district.value !== "all", f.building.value !== "any", numberRange(f.areaMin, f.areaMax).on, priceR.active(), numberRange(f.storeysMin, f.storeysMax).on, floorOn].filter(Boolean).length;
  }

  function applyFilters(list) {
    const city = f.city.value, district = f.district.value, building = f.building.value;
    const ar = numberRange(f.areaMin, f.areaMax);
    const p = priceR.range(), st = numberRange(f.storeysMin, f.storeysMax), fl = numberRange(f.floorMin, f.floorMax);
    const notFirst = f.notFirst.checked, notTop = f.notTop.checked;
    const storeysOn = st.on;
    const floorOn = fl.on || notFirst || notTop;
    const words = searchWords();

    const result = list.filter((l) => {
      if (!inView(l, view.deal, view.sub)) return false;
      if (!matchesSearch(l, words)) return false;
      if (city !== "all" && l.city !== city) return false;
      if (district !== "all" && l.district !== district) return false;
      if (building !== "any" && l.building !== building) return false;
      if (ar.on) {
        if (l.area === null) return false;
        if (ar.min !== null && l.area < ar.min) return false;
        if (ar.max !== null && l.area > ar.max) return false;
      }
      if (p.min !== null && toCur(l.price) < p.min) return false;
      if (p.max !== null && toCur(l.price) > p.max) return false;
      if (storeysOn) {
        if (l.storeys === null) return false;
        if (st.min !== null && l.storeys < st.min) return false;
        if (st.max !== null && l.storeys > st.max) return false;
      }
      if (floorOn) {
        if (l.floor === null) return false; // houses have no floor number
        if (fl.min !== null && l.floor < fl.min) return false;
        if (fl.max !== null && l.floor > fl.max) return false;
        if (notFirst && l.floor <= 1) return false;
        if (notTop && l.storeys !== null && l.floor >= l.storeys) return false;
      }
      return true;
    });

    const ppm = (l) => (l.area ? l.price / l.area : Infinity);
    const sorters = {
      new: (a, b) => b.createdAt - a.createdAt,
      "price-asc": (a, b) => a.price - b.price,
      "price-desc": (a, b) => b.price - a.price,
      "ppm-asc": (a, b) => ppm(a) - ppm(b),
      likes: (a, b) => score(b.key) - score(a.key) || b.createdAt - a.createdAt,
      views: (a, b) => viewCount(b.key) - viewCount(a.key) || b.createdAt - a.createdAt,
    };
    result.sort(sorters[f.sort.value] || sorters.new);
    return result;
  }

  // ---------- Rendering ----------
  function floorText(l) {
    if (isHouseType(l.type)) return l.storeys ? `${l.storeys}-storey ${l.type.toLowerCase()}` : l.type;
    if (l.floor && l.storeys) return `Floor ${l.floor} of ${l.storeys}`;
    if (l.floor) return `Floor ${l.floor}`;
    return l.storeys ? `${l.storeys}-storey building` : "";
  }

  const dealLabel = (l) => (l.deal === "rent" ? (l.term === "short" ? "Short-term rent" : "Long-term rent") : "For sale");
  const buildingLabel = (b) => (b === "new" ? "New build" : b === "old" ? "Old building" : "");
  const placeText = (l) => [l.district, l.city].filter((x, i, a) => x && !(i === 1 && a[0].startsWith(x))).join(", ");
  const priceUnit = (l) => (l.deal === "rent" ? (l.term === "short" ? "/night" : "/month") : "");
  const priceHTML = (l, compact) => `${fmtMoney(l.price, compact)}${priceUnit(l) ? `<small>${priceUnit(l)}</small>` : ""}`;

  function picture(l, extraClass, overlay) {
    const photo = store.photoUrl(l.photo);
    const color = cityColor(l.city);
    const icon = l.category === "house" ? ICON_HOUSE : l.category === "commercial" ? ICON_SHOP : ICON_FLAT;
    const tags = [`<span class="tag deal ${l.deal}">${dealLabel(l)}</span>`, `<span class="tag">${esc(l.type)}</span>`];
    if (l.example) tags.push('<span class="tag example">Example</span>');
    if (store.myId && l.sellerId === store.myId) tags.push('<span class="tag mine">Your listing</span>');
    return `<div class="pic ${extraClass || ""}" style="--tile:${color}">
      ${icon}
      ${photo ? `<img src="${esc(photo)}" alt="" loading="lazy">` : ""}
      ${extraClass ? "" : `<div class="tags">${tags.join("")}</div>`}
      ${overlay || ""}
    </div>`;
  }

  function cardHTML(l, i) {
    const chips = [];
    if (l.building) chips.push(buildingLabel(l.building));
    if (l.rooms) chips.push(`${l.rooms} room${l.rooms === 1 ? "" : "s"}`);
    if (l.area) chips.push(`${l.area} m²`);
    const ft = floorText(l);
    if (ft) chips.push(ft);
    const ppm = l.area && l.deal === "sale" ? `<span class="pic-ppm">${fmtMoney(l.price / l.area, true)} per m²</span>` : "";
    const overlay = `<div class="pic-price"><span class="price-big">${priceHTML(l, true)}</span>${ppm}</div>`;
    return `<article class="card" tabindex="0" data-key="${esc(l.key)}" style="--i:${Math.min(i || 0, 12)}" aria-label="${esc(l.title)}, ${esc(fmtMoney(l.price) + priceUnit(l))}">
      ${picture(l, "", overlay)}
      <div class="info">
        <h3>${esc(l.title)}</h3>
        <div class="where">${esc(placeText(l))}</div>
        <div class="specs">${chips.map((c) => `<span class="chip">${esc(c)}</span>`).join("")}</div>
        <div class="votes" data-key="${esc(l.key)}">${votesHTML(l.key)}</div>
        ${callHTML(l)}
      </div>
    </article>`;
  }

  function render() {
    if (!loaded) return;
    const all = allListings();
    byKey = new Map(all.map((l) => [l.key, l]));

    const forSale = all.filter((l) => l.deal === "sale").length;
    $("statSale").textContent = forSale;
    $("statRent").textContent = all.length - forSale;
    $("statDistricts").textContent = new Set(all.map((l) => l.city).filter(Boolean)).size;

    document.querySelectorAll("#sidebar [data-deal]").forEach((b) => {
      const n = b.querySelector(".n");
      if (n) n.textContent = all.filter((l) => inView(l, b.dataset.deal, b.dataset.sub || "")).length;
    });
    $("viewTitle").textContent = VIEW_TITLES[view.deal + "|" + view.sub] || "Listings";

    const list = applyFilters(all);
    const activeN = activeFilterCount();
    $("filterCount").hidden = !activeN;
    $("filterCount").textContent = activeN;

    const grid = $("grid");
    grid.innerHTML = list.map(cardHTML).join("");
    grid.querySelectorAll("img").forEach((img) => img.addEventListener("error", () => img.remove(), { once: true }));

    const inSection = all.filter((l) => inView(l, view.deal, view.sub)).length;
    $("count").innerHTML = `Showing <b>${list.length}</b> of <b>${inSection}</b> listings`;
    const noneAtAll = inSection === 0;
    $("empty").hidden = list.length > 0;
    $("emptyTitle").textContent = noneAtAll ? "Nothing listed here yet" : "No listings match these filters";
    $("emptyText").textContent = noneAtAll ? "Have a property like this? Use “Post a listing” at the top to add the first one." : "Widen the price range, pick another district or clear the floor filters.";
  }

  function refreshAccount() {
    const m = me();
    const hello = $("hello");
    hello.hidden = !m;
    if (m) hello.textContent = "Hi, " + String(m.name || "seller");
    $("signupBtn").hidden = !!m;
  }

  // ---------- Toast ----------
  let toastTimer = null;
  function toast(msg) {
    const t = $("toast");
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 4000);
  }

  // ---------- Dialogs ----------
  function openDialog(d) { if (!d.open) d.showModal(); }
  document.querySelectorAll("dialog").forEach((d) => {
    d.addEventListener("click", (e) => {
      if (e.target === d) d.close();
      if (e.target.closest("[data-close]")) d.close();
    });
  });

  function showFormError(id, msg) {
    const el = $(id);
    el.textContent = msg || "";
    el.hidden = !msg;
  }

  function requireIdentity() {
    if (store && store.myId) return true;
    toast("Sign in to claude.ai to sign up as an owner.");
    return false;
  }

  // Sign up
  function openSignup(thenPost, note) {
    if (!requireIdentity()) return;
    openPostAfterSignup = !!thenPost;
    $("signupNote").textContent = note || "Owners sign up to post listings. Buyers see your name and phone number on every listing you post.";
    showFormError("signupError", "");
    openDialog($("signupDialog"));
    $("sFirst").focus();
  }

  $("signupForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (busy) return;
    const firstName = $("sFirst").value.trim();
    const surname = $("sLast").value.trim();
    const phone = $("sPhone").value.trim();
    if (firstName.length < 2) return showFormError("signupError", "Enter your first name (at least 2 letters).");
    if (surname.length < 2) return showFormError("signupError", "Enter your surname (at least 2 letters).");
    if (!/^\+?[\d\s()-]{9,}$/.test(phone)) return showFormError("signupError", "Enter a phone number buyers can call, e.g. +998 90 123 45 67.");
    const name = `${firstName} ${surname}`;

    const existing = me();
    const doc = existing ? clone(existing) : { listings: [], joinedAt: Date.now() };
    Object.assign(doc, { name, firstName, surname, phone });
    delete doc.email;

    busy = true;
    $("signupSubmit").disabled = true;
    try {
      await store.saveSeller(store.myId, doc);
      $("signupDialog").close();
      toast(`Welcome, ${firstName}. You can now post listings.`);
      if (openPostAfterSignup) openPost();
    } catch (err) {
      showFormError("signupError", errorMessage(err));
    } finally {
      busy = false;
      $("signupSubmit").disabled = false;
    }
  });

  // Post a listing
  function syncPostForm() {
    const type = $("pType").value;
    const house = isHouseType(type);
    const commercial = COMMERCIAL_TYPES.includes(type);
    $("pFloorField").hidden = house;
    $("pFloorLabel").textContent = commercial ? "Floor (optional)" : "Apartment floor";
    $("pStoreysLabel").textContent = house ? "Storeys in house" : "Storeys in building";

    const rent = $("pDeal").value === "rent";
    const short = $("pTerm").value === "short";
    $("pTermField").hidden = !rent;
    const uzs = $("pCurrency").value === "UZS";
    const unit = uzs ? "so'm" : "$";
    $("pPriceLabel").textContent = rent ? (short ? `Price per night, ${unit}` : `Price per month, ${unit}`) : `Price, ${unit}`;
    const k = uzs ? UZS_PER_USD : 1;
    $("pPrice").min = "1";
    $("pPrice").step = String(rent ? k : 1000 * k);
    $("pPrice").placeholder = String((rent ? (short ? 50 : 600) : 90000) * k);
  }

  function openPost() {
    if (!requireIdentity()) return;
    const m = me();
    if (!m) return openSignup(true);
    $("postAs").textContent = `Posting as ${m.name} · ${m.phone}`;
    $("pPhotoField").hidden = !store.canPhoto;
    showFormError("postError", "");
    // Start the form in the section the visitor is browsing.
    $("pCurrency").value = currency;
    if (view.deal !== "all") $("pDeal").value = view.deal;
    if (view.deal === "rent" && view.sub) $("pTerm").value = view.sub;
    if (view.deal === "sale" && view.sub && categoryOf($("pType").value) !== view.sub) {
      $("pType").value = { apartment: "Apartment", house: "House", commercial: "Office" }[view.sub];
    }
    syncPostForm();
    openDialog($("postDialog"));
    $("pTitle").focus();
  }

  ["pType", "pDeal", "pTerm", "pCurrency"].forEach((id) => $(id).addEventListener("change", syncPostForm));

  // Currency switch in the filters
  function syncCurrency() {
    document.querySelectorAll("[data-currency]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.currency === currency)));
  }
  $("currencySwitch").addEventListener("click", (e) => {
    const b = e.target.closest("[data-currency]");
    if (!b || b.dataset.currency === currency) return;
    currency = b.dataset.currency;
    try { localStorage.setItem("homefinder.currency", currency); } catch (err) { /* no storage */ }
    syncCurrency();
    rebuildSliders(false); // price steps are different in so'm, so the range starts fresh
    render();
  });
  $("rateHint").textContent = `1 US dollar = ${groupSpaces(UZS_PER_USD)} so'm`;
  syncCurrency();

  $("pPhoto").addEventListener("change", async () => {
    const file = $("pPhoto").files[0] || null;
    pickedPhoto = file;
    const prev = $("pPreview");
    if (!file) { prev.hidden = true; prev.removeAttribute("src"); return; }
    try { prev.src = await readAsDataUrl(file); prev.hidden = false; } catch (e) { prev.hidden = true; }
  });

  $("postForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (busy) return;
    const m = me();
    if (!m) return openSignup(true);

    const type = $("pType").value;
    const house = isHouseType(type);
    const isApartment = categoryOf(type) === "apartment";
    const rent = $("pDeal").value === "rent";
    const l = {
      id: "l" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      title: $("pTitle").value.trim(),
      deal: rent ? "rent" : "sale",
      term: rent ? ($("pTerm").value === "short" ? "short" : "long") : null,
      type,
      city: $("pCity").value,
      district: $("pDistrict").value,
      building: $("pBuilding").value,
      // Saved in US dollars; a price typed in so'm is converted.
      price: inputNum($("pPrice")) === null ? null
        : $("pCurrency").value === "UZS" ? Math.round(inputNum($("pPrice")) / UZS_PER_USD) : inputNum($("pPrice")),
      area: inputNum($("pArea")),
      rooms: inputNum($("pRooms")),
      storeys: inputNum($("pStoreys")),
      floor: house ? null : inputNum($("pFloor")),
      description: $("pDesc").value.trim(),
      photo: null,
      createdAt: Date.now(),
    };

    if (l.title.length < 4) return showFormError("postError", "Write a headline of at least 4 characters.");
    if (l.building !== "new" && l.building !== "old") return showFormError("postError", "Choose whether the building is new or old.");
    if (!CITIES[l.city]) return showFormError("postError", "Choose the city the property is in.");
    if (!CITIES[l.city].includes(l.district)) return showFormError("postError", "Choose the district the property is in.");
    if (rent && (!l.price || l.price < 1)) return showFormError("postError", l.term === "short" ? "Enter the price per night." : "Enter the price per month.");
    if (!rent && (!l.price || l.price < 1000)) return showFormError("postError", `Enter a price of at least $1,000 (${groupSpaces(1000 * UZS_PER_USD)} so'm).`);
    if (!l.area || l.area < 5) return showFormError("postError", "Enter the area in m².");
    if (!l.rooms || l.rooms < 1) return showFormError("postError", "Enter the number of rooms.");
    if (!l.storeys || l.storeys < 1) return showFormError("postError", house ? "Enter how many storeys the house has." : "Enter how many storeys the building has.");
    if (isApartment && (!l.floor || l.floor < 1)) return showFormError("postError", "Enter which floor the apartment is on.");
    if (!house && l.floor !== null && l.floor > l.storeys) return showFormError("postError", `The floor can't be higher than the building (${l.storeys} storeys).`);

    busy = true;
    const btn = $("postSubmit");
    btn.disabled = true;
    try {
      if (pickedPhoto && store.canPhoto) {
        btn.textContent = "Uploading photo…";
        l.photo = await store.uploadPhoto(pickedPhoto);
      }
      btn.textContent = "Publishing…";
      const doc = clone(me());
      doc.listings = [l].concat(Array.isArray(doc.listings) ? doc.listings : []);
      await store.saveSeller(store.myId, doc);
      $("postDialog").close();
      $("postForm").reset();
      fillDistricts($("pDistrict"), "", "Choose a district", "");
      pickedPhoto = null;
      $("pPreview").hidden = true;
      toast("Your listing is live.");
    } catch (err) {
      showFormError("postError", errorMessage(err));
    } finally {
      busy = false;
      btn.disabled = false;
      btn.textContent = "Publish listing";
    }
  });

  // Listing details
  function openDetail(key) {
    const l = byKey.get(key);
    if (!l) return;
    recordView(l);
    const facts = [
      ["Listing", dealLabel(l)], ["Type", l.type], ["Building", buildingLabel(l.building)], ["City", l.city], ["District", l.district], ["Rooms", l.rooms], ["Area", l.area ? `${l.area} m²` : ""],
      [isHouseType(l.type) ? "Storeys" : "Floor", isHouseType(l.type) ? l.storeys : (l.floor && l.storeys ? `${l.floor} of ${l.storeys}` : l.floor)],
      ["Price per m²", l.area && l.deal === "sale" ? fmtMoney(l.price / l.area) : ""],
    ].filter((x) => x[1] !== null && x[1] !== "" && x[1] !== undefined);
    const posted = l.createdAt ? new Date(l.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";
    $("detailBody").innerHTML = `
      ${picture(l, "detail-pic")}
      <div class="dlg-body detail-body">
        <div>
          <div class="price">${priceHTML(l)}</div>
          <h2 style="margin:2px 0 0;font:700 1.35rem/1.25 var(--display)">${esc(l.title)}</h2>
          <p class="muted">${esc(placeText(l))}${posted ? " · Posted " + esc(posted) : ""}${l.example ? " · Example listing" : ""}</p>
          <p class="detail-views">${ICON_EYE}<span id="detailViews" data-key="${esc(l.key)}">${viewsLabel(viewCount(l.key))}</span></p>
        </div>
        <dl class="facts">${facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
        ${l.description ? `<p class="desc">${esc(l.description)}</p>` : ""}
        <div class="seller">
          <div><span class="muted">Seller</span><b>${esc(l.sellerName)}</b>${l.email ? `<span class="muted">${esc(l.email)}</span>` : ""}</div>
          ${callHTML(l, true)}
        </div>
      </div>
      <div class="dlg-foot">
        ${canManage(l) ? '<button type="button" class="btn danger" id="deleteBtn">Delete listing</button>' : ""}
        <button type="button" class="btn ghost-dark" data-close>Close</button>
      </div>`;
    $("detailBody").querySelectorAll("img").forEach((img) => img.addEventListener("error", () => img.remove(), { once: true }));

    const del = $("deleteBtn");
    if (del) {
      del.addEventListener("click", async () => {
        if (!del.classList.contains("armed")) {
          del.classList.add("armed");
          del.textContent = "Click again to delete";
          return;
        }
        if (busy) return;
        busy = true;
        del.disabled = true;
        try {
          const doc = clone(sellers[l.sellerId]);
          doc.listings = (doc.listings || []).filter((x) => String(x.id) !== l.id);
          await store.saveSeller(l.sellerId, doc);
          $("detailDialog").close();
          toast("Listing deleted.");
        } catch (err) {
          toast(errorMessage(err));
          del.disabled = false;
        } finally {
          busy = false;
        }
      });
    }
    openDialog($("detailDialog"));
  }

  $("grid").addEventListener("click", (e) => {
    const reveal = e.target.closest(".call[data-reveal]");
    if (reveal) { revealPhone(reveal); return; }
    if (e.target.closest(".call")) return; // the tap follows the phone link instead of opening the details
    const vote = e.target.closest(".vote");
    if (vote) {
      castVote(vote.closest(".votes").dataset.key, Number(vote.dataset.vote));
      return;
    }
    const card = e.target.closest(".card");
    if (card) openDetail(card.dataset.key);
  });
  $("detailBody").addEventListener("click", (e) => {
    const reveal = e.target.closest(".call[data-reveal]");
    if (reveal) revealPhone(reveal);
  });
  $("grid").addEventListener("keydown", (e) => {
    if (e.target.closest(".vote, .call")) return; // Enter/Space presses the button itself
    const card = e.target.closest(".card");
    if (card && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openDetail(card.dataset.key); }
  });

  // ---------- Wiring ----------
  function fillSelect(sel, values) {
    values.forEach((v) => { const o = document.createElement("option"); o.value = v; o.textContent = v; sel.appendChild(o); });
  }
  // District lists follow the chosen city.
  function fillDistricts(sel, city, firstLabel, firstValue) {
    sel.innerHTML = "";
    const first = document.createElement("option");
    first.value = firstValue;
    first.textContent = CITIES[city] ? firstLabel : "Choose a city first";
    sel.appendChild(first);
    fillSelect(sel, CITIES[city] || []);
    sel.disabled = !CITIES[city];
  }
  fillSelect(f.city, CITY_NAMES);
  fillDistricts(f.district, "all", "All districts", "all");
  f.city.addEventListener("change", () => {
    fillDistricts(f.district, f.city.value, "All districts", "all");
    render();
  });

  const pCityFirst = document.createElement("option");
  pCityFirst.value = "";
  pCityFirst.textContent = "Choose a city";
  $("pCity").appendChild(pCityFirst);
  fillSelect($("pCity"), CITY_NAMES);
  fillDistricts($("pDistrict"), "", "Choose a district", "");
  $("pCity").addEventListener("change", () => fillDistricts($("pDistrict"), $("pCity").value, "Choose a district", ""));
  fillSelect($("pType"), TYPES);

  $("filterForm").addEventListener("submit", (e) => e.preventDefault());
  [f.district, f.building, f.sort, f.notFirst, f.notTop].forEach((el) => el.addEventListener("change", render));
  [f.areaMin, f.areaMax, f.storeysMin, f.storeysMax, f.floorMin, f.floorMax, f.search].forEach((el) => el.addEventListener("input", render));
  $("resetBtn").addEventListener("click", () => {
    f.city.value = "all";
    fillDistricts(f.district, "all", "All districts", "all");
    f.notFirst.checked = false;
    f.notTop.checked = false;
    f.building.value = "any";
    [f.areaMin, f.areaMax, f.storeysMin, f.storeysMax, f.floorMin, f.floorMax, f.search].forEach((el) => { el.value = ""; });
    priceR.reset();
    render();
  });
  $("filterBtn").addEventListener("click", () => {
    const open = $("filterForm").hidden;
    $("filterForm").hidden = !open;
    $("filterBtn").setAttribute("aria-expanded", open ? "true" : "false");
  });
  priceR.setStops([0], false);
  // Sidebar: For sale / For rent open their sub-options; each button narrows the listings.
  function syncSidebar() {
    document.querySelectorAll("#sidebar [data-deal]").forEach((b) => {
      const active = b.dataset.deal === view.deal && (b.dataset.sub || "") === view.sub;
      b.setAttribute("aria-pressed", active ? "true" : "false");
    });
    ["sale", "rent"].forEach((d) => {
      const open = view.deal === d;
      $(d + "Sub").hidden = !open;
      $(d + "Btn").setAttribute("aria-expanded", open ? "true" : "false");
    });
  }
  function setView(deal, sub) {
    view = { deal, sub: sub || "" };
    syncSidebar();
    rebuildSliders(false); // sale and rent prices differ a lot, so the price range starts fresh
    render();
  }
  $("sidebar").addEventListener("click", (e) => {
    const b = e.target.closest("[data-deal]");
    if (b) setView(b.dataset.deal, b.dataset.sub);
  });
  // Quick picks in the hero jump straight to a section.
  $("quickPicks").addEventListener("click", (e) => {
    const b = e.target.closest("[data-deal]");
    if (!b) return;
    setView(b.dataset.deal, b.dataset.sub);
    $("listings").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  });
  syncSidebar();

  // ---------- Hero skyline: a night city whose windows switch on and off ----------
  (function skyline() {
    const canvas = $("skyline");
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext("2d");
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    let buildings = [], w = 0, h = 0, beacon = true;

    function build() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed = 7;
      buildings = [];
      for (let layer = 0; layer < 2; layer++) {
        let x = -10;
        while (x < w + 10) {
          const bw = 34 + rand() * 70;
          const bh = (layer === 0 ? 0.35 : 0.55) * h + rand() * (layer === 0 ? 0.55 : 0.4) * h;
          const cols = Math.max(2, Math.floor((bw - 10) / 11));
          const rows = Math.max(2, Math.floor((bh - 16) / 14));
          const lit = [];
          for (let i = 0; i < cols * rows; i++) lit.push(rand() < (layer === 0 ? 0.18 : 0.32));
          buildings.push({ x, bw, bh, cols, rows, lit, layer, spire: rand() < 0.15 });
          x += bw + (layer === 0 ? -8 : 4 + rand() * 10);
        }
      }
      draw();
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      buildings.forEach((b) => {
        const top = h - b.bh;
        ctx.fillStyle = b.layer === 0 ? "#132653" : "#070f24";
        ctx.fillRect(b.x, top, b.bw, b.bh);
        if (b.spire) {
          ctx.fillRect(b.x + b.bw / 2 - 1.5, top - 18, 3, 18);
          // Red aircraft warning light that blinks
          ctx.save();
          ctx.shadowColor = "#ff2d4b";
          ctx.shadowBlur = beacon ? 14 : 0;
          ctx.fillStyle = beacon ? "#ff2d4b" : "rgba(255, 45, 75, .25)";
          ctx.beginPath();
          ctx.arc(b.x + b.bw / 2, top - 20, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        const gx = (b.bw - b.cols * 11) / 2 + 3;
        for (let r = 0; r < b.rows; r++) {
          for (let c = 0; c < b.cols; c++) {
            if (!b.lit[r * b.cols + c]) continue;
            const warm = (r * 7 + c * 3 + Math.round(b.x)) % 11 === 0; // a few red-lit windows
            ctx.fillStyle = b.layer === 0 ? "rgba(120, 165, 255, .35)" : warm ? "rgba(255, 90, 110, .9)" : "rgba(175, 205, 255, .92)";
            ctx.fillRect(b.x + gx + c * 11, top + 12 + r * 14, 5, 7);
          }
        }
      });
    }

    function flicker() {
      const front = buildings.filter((b) => b.layer === 1);
      for (let k = 0; k < 3; k++) {
        const b = front[Math.floor(Math.random() * front.length)];
        if (!b) return;
        const i = Math.floor(Math.random() * b.lit.length);
        b.lit[i] = !b.lit[i];
      }
      beacon = !beacon;
      draw();
    }

    build();
    let t = null;
    window.addEventListener("resize", () => { clearTimeout(t); t = setTimeout(build, 150); });
    if (!still) setInterval(() => { if (!document.hidden) flicker(); }, 450);
  })();

  $("signupBtn").addEventListener("click", () => openSignup(false));
  $("postBtn").addEventListener("click", openPost);

  // ---------- Start ----------
  async function start() {
    const claude = window.claude;
    if (claude && typeof claude.use === "function") {
      try {
        const db = await claude.use("db");
        if (db) {
          const [user, assets] = await Promise.all([claude.use("user"), claude.use("assets")]);
          store = await dbStore(db, user, assets);
        }
      } catch (e) { store = null; }
    }
    if (!store) store = localStore();
    store.subscribe((data) => {
      sellers = data || {};
      loaded = true;
      refreshAccount();
      rebuildSliders(true);
      render();
    });
    store.subscribeVotes((data) => {
      votes = data || {};
      if (!voteSaving && !voteDirty) {
        const mine = store.myId ? votes[store.myId] : null;
        myVotes = mine && mine.v ? clone(mine.v) : {};
        mySeen = mine && mine.seen ? clone(mine.seen) : {};
      }
      if (f.sort.value === "likes" || f.sort.value === "views") render();
      else paintVotes();
    });
  }
  start();
})();
