// IA AGENT DVL — Cloudflare Worker
// Routes:
//   /news?lang=ar|fr|en   RSS headlines (cached 15 min)
//   /matches              football odds from The Odds API (needs ODDS_API_KEY, cached 12 h)
//   /scores               live scores & today's results from ESPN (free, cached 45 s)
//   /fng                  crypto Fear & Greed index (cached 30 min)
//   /tg?ch=<channel>      latest posts of a public Telegram channel (cached 5 min)

const ORIGINS = ["https://hakimel5454-afk.github.io"];

const LEAGUES = {
  soccer_uefa_champs_league: "UCL",
  soccer_epl: "Premier League",
  soccer_spain_la_liga: "La Liga",
  soccer_germany_bundesliga: "Bundesliga",
  soccer_italy_serie_a: "Serie A",
  soccer_france_ligue_one: "Ligue 1"
};
// Arab leagues are picked up automatically from The Odds API sports list when available.
const ARAB_RE = /saudi|egypt|morocc|botola|uae|emirat|qatar|alger|tunis/i;

// ESPN league codes (unofficial public scoreboard). Unknown codes simply return nothing.
const ESPN = {
  "uefa.champions": "UCL",
  "eng.1": "Premier League",
  "esp.1": "La Liga",
  "ger.1": "Bundesliga",
  "ita.1": "Serie A",
  "fra.1": "Ligue 1",
  "ksa.1": "Saudi Pro League",
  "egy.1": "Egyptian Premier League",
  "mar.1": "Botola Pro",
  "uae.1": "UAE Pro League",
  "qat.1": "Qatar Stars League"
};

const FEEDS = {
  ar: [["BBC عربي", "https://feeds.bbci.co.uk/arabic/rss.xml", "world"], ["فرانس 24", "https://www.france24.com/ar/rss", "world"], ["DW عربية", "https://rss.dw.com/xml/rss-ar-all", "world"]],
  fr: [["BBC Afrique", "https://feeds.bbci.co.uk/afrique/rss.xml", "world"], ["France 24", "https://www.france24.com/fr/rss", "world"], ["RFI", "https://www.rfi.fr/fr/rss", "world"]],
  en: [["BBC World", "https://feeds.bbci.co.uk/news/world/rss.xml", "world"], ["Al Jazeera", "https://www.aljazeera.com/xml/rss/all.xml", "world"], ["BBC Business", "https://feeds.bbci.co.uk/news/business/rss.xml", "economy"], ["BBC Tech", "https://feeds.bbci.co.uk/news/technology/rss.xml", "tech"]],
  crypto: [["CoinDesk", "https://www.coindesk.com/arc/outboundfeeds/rss/", "crypto"], ["Cointelegraph", "https://cointelegraph.com/rss", "crypto"]]
};

const UA = "Mozilla/5.0 IAAgentDVL";
const MIN = 60 * 1000;
const mem = {}; // in-memory cache per isolate: key -> { t, body }

function cached(key, ttl) {
  const c = mem[key];
  return c && Date.now() - c.t < ttl ? c.body : null;
}
function store(key, body) {
  mem[key] = { t: Date.now(), body };
  return body;
}

function dec(s) {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (m, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&#(\d+);/g, (m, n) => String.fromCodePoint(+n)).replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").trim();
}
function tag(b, n) {
  const m = b.match(new RegExp("<" + n + "[^>]*>([\\s\\S]*?)</" + n + ">", "i"));
  return m ? dec(m[1]) : "";
}
function parseRss(xml, src, cat) {
  const out = [];
  const re = /<(item|entry)[\s>][\s\S]*?<\/\1>/gi;
  let m;
  while ((m = re.exec(xml)) && out.length < 15) {
    const b = m[0];
    let link = tag(b, "link");
    if (!link) { const a = b.match(/<link[^>]*href="([^"]+)"/i); link = a ? a[1] : ""; }
    const t = tag(b, "title");
    const ts = Date.parse(tag(b, "pubDate") || tag(b, "dc:date") || tag(b, "published") || tag(b, "updated"));
    if (t && /^https?:\/\//.test(link)) out.push({ t, l: link, s: src, c: cat, d: isNaN(ts) ? 0 : ts });
  }
  return out;
}

async function get(url, ms = 6000, accept = "*/*") {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), ms);
  try {
    const r = await fetch(url, { signal: ac.signal, headers: { "User-Agent": UA, "Accept": accept } });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r;
  } finally { clearTimeout(to); }
}

// ---------- /news ----------
async function news(lang) {
  const key = "news:" + lang;
  const c = cached(key, 15 * MIN);
  if (c) return c;
  const failed = [];
  const res = await Promise.all([...FEEDS[lang], ...FEEDS.crypto].map(f =>
    get(f[1], 6000, "application/rss+xml, application/xml, text/xml, */*")
      .then(r => r.text()).then(x => parseRss(x, f[0], f[2]))
      .catch(() => { failed.push(f[0]); return []; })));
  const items = res.flat().sort((a, b) => b.d - a.d).slice(0, 40);
  const body = JSON.stringify({ updated: new Date().toISOString(), failed, items });
  return items.length ? store(key, body) : body;
}

// ---------- /matches ----------
async function matches(env) {
  if (!env.ODDS_API_KEY) return { status: 500, body: JSON.stringify({ error: "missing ODDS_API_KEY" }) };
  const c = cached("matches", 12 * 60 * MIN);
  if (c) return { body: c };
  const base = "https://api.the-odds-api.com/v4/sports";
  const sres = await fetch(base + "?apiKey=" + env.ODDS_API_KEY);
  if (!sres.ok) return { status: 502, body: JSON.stringify({ error: "key rejected", status: sres.status }) };
  const sports = await sres.json();
  const names = {};
  for (const s of sports) {
    if (!s.active) continue;
    if (LEAGUES[s.key]) names[s.key] = LEAGUES[s.key];
    else if (/^soccer_/.test(s.key) && ARAB_RE.test(s.key + " " + s.title + " " + (s.description || ""))) names[s.key] = s.title;
  }
  let remaining = null;
  const list = [];
  await Promise.all(Object.keys(names).map(async k => {
    const r = await fetch(base + "/" + k + "/odds?regions=eu&markets=h2h&oddsFormat=decimal&apiKey=" + env.ODDS_API_KEY);
    const rem = r.headers.get("x-requests-remaining");
    if (rem !== null) remaining = rem;
    if (!r.ok) return;
    for (const e of await r.json()) {
      const b = e.bookmakers && e.bookmakers[0];
      const m = b && b.markets && b.markets.find(x => x.key === "h2h");
      const o = {};
      if (m) for (const x of m.outcomes) o[x.name === e.home_team ? "1" : x.name === e.away_team ? "2" : "X"] = x.price;
      list.push({ league: names[k], home: e.home_team, away: e.away_team, time: e.commence_time, odds: o, book: b ? b.title : null });
    }
  }));
  list.sort((a, b) => a.time.localeCompare(b.time));
  return { body: store("matches", JSON.stringify({ updated: new Date().toISOString(), remaining, matches: list })) };
}

// ---------- /scores ----------
function parseEspn(j, code) {
  const out = [];
  for (const e of (j && j.events) || []) {
    const c = e.competitions && e.competitions[0];
    if (!c) continue;
    const h = (c.competitors || []).find(x => x.homeAway === "home");
    const a = (c.competitors || []).find(x => x.homeAway === "away");
    if (!h || !a) continue;
    const st = (c.status || e.status || {}).type || {};
    out.push({
      id: String(e.id),
      league: ESPN[code] || code,
      home: (h.team && (h.team.displayName || h.team.name)) || "?",
      away: (a.team && (a.team.displayName || a.team.name)) || "?",
      hs: h.score != null ? String(h.score) : "",
      as: a.score != null ? String(a.score) : "",
      state: st.state || "pre",             // pre | in | post
      detail: st.shortDetail || st.detail || "",
      time: e.date
    });
  }
  return out;
}
function ymd(d) { return d.toISOString().slice(0, 10).replace(/-/g, ""); }
async function scores() {
  const c = cached("scores", 45 * 1000);
  if (c) return c;
  const now = new Date();
  const dates = ymd(new Date(now - 864e5)) + "-" + ymd(new Date(+now + 864e5));
  const failed = [];
  const res = await Promise.all(Object.keys(ESPN).map(code =>
    get("https://site.api.espn.com/apis/site/v2/sports/soccer/" + code + "/scoreboard?dates=" + dates, 6000, "application/json")
      .then(r => r.json()).then(j => parseEspn(j, code))
      .catch(() => { failed.push(code); return []; })));
  const list = res.flat().sort((a, b) => a.time.localeCompare(b.time));
  const body = JSON.stringify({ updated: now.toISOString(), failed, matches: list });
  return list.length ? store("scores", body) : body;
}

// ---------- /fng ----------
async function fng() {
  const c = cached("fng", 30 * MIN);
  if (c) return c;
  const j = await (await get("https://api.alternative.me/fng/?limit=2", 6000, "application/json")).json();
  const d = (j.data || []).map(x => ({ v: +x.value, c: x.value_classification, t: +x.timestamp * 1000 }));
  if (!d.length) throw new Error("empty");
  return store("fng", JSON.stringify({ value: d[0].v, label: d[0].c, prev: d[1] ? d[1].v : null, t: d[0].t }));
}

// ---------- /tg ----------
function parseTg(html, ch) {
  const title = (html.match(/<div class="tgme_channel_info_header_title[^"]*"[^>]*>([\s\S]*?)<\/div>/) || [])[1];
  const subs = (html.match(/<span class="counter_value">([^<]+)<\/span>\s*<span class="counter_type">(?:subscribers|members)/) || [])[1];
  const posts = [];
  const parts = html.split('<div class="tgme_widget_message_wrap').slice(1);
  for (const p of parts) {
    const id = (p.match(/data-post="([^"]+)"/) || [])[1];
    if (!id) continue;
    const tm = p.match(/<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/);
    const date = (p.match(/<time[^>]*datetime="([^"]+)"/) || [])[1];
    const text = tm ? dec(tm[1]) : "";
    const media = /tgme_widget_message_photo|tgme_widget_message_video/.test(p);
    if (!text && !media) continue;
    posts.push({ id, text: text.slice(0, 600), media, d: date ? Date.parse(date) : 0, l: "https://t.me/" + id });
  }
  return { ch, title: title ? dec(title) : ch, subs: subs || null, posts: posts.reverse().slice(0, 10) };
}
async function tg(ch) {
  const key = "tg:" + ch;
  const c = cached(key, 5 * MIN);
  if (c) return c;
  const html = await (await get("https://t.me/s/" + ch, 7000, "text/html")).text();
  const data = parseTg(html, ch);
  if (!data.posts.length) throw new Error("no posts");
  return store(key, JSON.stringify(data));
}

// ---------- router ----------
export default {
  async fetch(req, env) {
    const origin = req.headers.get("Origin") || "";
    const allow = ORIGINS.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ? origin : ORIGINS[0];
    const cors = { "Access-Control-Allow-Origin": allow, "Vary": "Origin", "Content-Type": "application/json; charset=utf-8" };
    const reply = (body, status = 200) => new Response(body, { status, headers: cors });
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: { ...cors, "Access-Control-Allow-Methods": "GET", "Access-Control-Allow-Headers": "*" } });
    }
    const u = new URL(req.url);
    try {
      switch (u.pathname) {
        case "/news": {
          const q = u.searchParams.get("lang");
          return reply(await news(["ar", "fr", "en"].includes(q) ? q : "en"));
        }
        case "/matches": {
          const r = await matches(env);
          return reply(r.body, r.status || 200);
        }
        case "/scores":
          return reply(await scores());
        case "/fng":
          return reply(await fng());
        case "/tg": {
          const ch = (u.searchParams.get("ch") || "").replace(/^@/, "");
          if (!/^[A-Za-z][A-Za-z0-9_]{3,31}$/.test(ch)) return reply(JSON.stringify({ error: "bad channel" }), 400);
          return reply(await tg(ch));
        }
        default:
          return reply(JSON.stringify({ ok: true, name: "IA AGENT DVL", routes: ["/news", "/matches", "/scores", "/fng", "/tg"] }));
      }
    } catch (e) {
      return reply(JSON.stringify({ error: "fetch failed" }), 502);
    }
  }
};
