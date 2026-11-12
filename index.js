const ORIGIN = "https://hakimel5454-afk.github.io";
const LEAGUES = {
  soccer_uefa_champs_league: "UCL",
  soccer_epl: "Premier League",
  soccer_spain_la_liga: "La Liga",
  soccer_germany_bundesliga: "Bundesliga",
  soccer_italy_serie_a: "Serie A",
  soccer_france_ligue_one: "Ligue 1"
};
const FEEDS = {
  ar: [["BBC عربي", "https://feeds.bbci.co.uk/arabic/rss.xml", "world"], ["فرانس 24", "https://www.france24.com/ar/rss", "world"], ["DW عربية", "https://rss.dw.com/xml/rss-ar-all", "world"]],
  fr: [["BBC Afrique", "https://feeds.bbci.co.uk/afrique/rss.xml", "world"], ["France 24", "https://www.france24.com/fr/rss", "world"], ["RFI", "https://www.rfi.fr/fr/rss", "world"]],
  en: [["BBC World", "https://feeds.bbci.co.uk/news/world/rss.xml", "world"], ["Al Jazeera", "https://www.aljazeera.com/xml/rss/all.xml", "world"], ["BBC Business", "https://feeds.bbci.co.uk/news/business/rss.xml", "economy"], ["BBC Tech", "https://feeds.bbci.co.uk/news/technology/rss.xml", "tech"]],
  crypto: [["CoinDesk", "https://www.coindesk.com/arc/outboundfeeds/rss/", "crypto"], ["Cointelegraph", "https://cointelegraph.com/rss", "crypto"]]
};
const ncache = {};
function dec(s) {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (m, n) => String.fromCharCode(+n)).replace(/&amp;/g, "&").trim();
}
function tag(b, n) {
  const m = b.match(new RegExp("<" + n + "[^>]*>([\\s\\S]*?)</" + n + ">", "i"));
  return m ? dec(m[1]) : "";
}
function parse(xml, src, cat) {
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
async function getFeed(f) {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 6000);
  try {
    const r = await fetch(f[1], { signal: ac.signal, headers: { "User-Agent": "Mozilla/5.0 IAAgentDVL", "Accept": "application/rss+xml, application/xml, text/xml, */*" } });
    if (!r.ok) throw new Error("bad");
    return parse(await r.text(), f[0], f[2]);
  } finally { clearTimeout(to); }
}
const TTL = 12 * 3600 * 1000;
let cache = null;
const cors = { "Access-Control-Allow-Origin": ORIGIN, "Content-Type": "application/json; charset=utf-8" };

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: { ...cors, "Access-Control-Allow-Methods": "GET", "Access-Control-Allow-Headers": "*" } });
    }
    const u = new URL(req.url);
    if (u.pathname === "/news") {
      const q = u.searchParams.get("lang");
      const lang = ["ar", "fr", "en"].includes(q) ? q : "en";
      const c = ncache[lang];
      if (c && Date.now() - c.t < 15 * 60 * 1000) return new Response(c.body, { headers: cors });
      const failed = [];
      const res = await Promise.all([...FEEDS[lang], ...FEEDS.crypto].map(f => getFeed(f).catch(() => { failed.push(f[0]); return []; })));
      const items = res.flat().sort((a, b) => b.d - a.d).slice(0, 40);
      const body = JSON.stringify({ updated: new Date().toISOString(), failed, items });
      if (items.length) ncache[lang] = { t: Date.now(), body };
      return new Response(body, { headers: cors });
    }
    if (u.pathname !== "/matches") {
      return new Response(JSON.stringify({ ok: true, name: "IA AGENT DVL" }), { headers: cors });
    }
    if (!env.ODDS_API_KEY) {
      return new Response(JSON.stringify({ error: "missing ODDS_API_KEY" }), { status: 500, headers: cors });
    }
    if (cache && Date.now() - cache.t < TTL) {
      return new Response(cache.body, { headers: cors });
    }
    try {
      const base = "https://api.the-odds-api.com/v4/sports";
      const sres = await fetch(base + "?apiKey=" + env.ODDS_API_KEY);
      if (!sres.ok) return new Response(JSON.stringify({ error: "key rejected", status: sres.status }), { status: 502, headers: cors });
      const sports = await sres.json();
      const active = new Set(sports.filter(x => x.active).map(x => x.key));
      const keys = Object.keys(LEAGUES).filter(k => active.has(k));
      let remaining = null;
      const matches = [];
      await Promise.all(keys.map(async k => {
        const r = await fetch(base + "/" + k + "/odds?regions=eu&markets=h2h&oddsFormat=decimal&apiKey=" + env.ODDS_API_KEY);
        const rem = r.headers.get("x-requests-remaining");
        if (rem !== null) remaining = rem;
        if (!r.ok) return;
        for (const e of await r.json()) {
          const b = e.bookmakers && e.bookmakers[0];
          const m = b && b.markets && b.markets.find(x => x.key === "h2h");
          const o = {};
          if (m) for (const x of m.outcomes) o[x.name === e.home_team ? "1" : x.name === e.away_team ? "2" : "X"] = x.price;
          matches.push({ league: LEAGUES[k], home: e.home_team, away: e.away_team, time: e.commence_time, odds: o, book: b ? b.title : null });
        }
      }));
      matches.sort((a, b) => a.time.localeCompare(b.time));
      const body = JSON.stringify({ updated: new Date().toISOString(), remaining, matches });
      cache = { t: Date.now(), body };
      return new Response(body, { headers: cors });
    } catch (e) {
      return new Response(JSON.stringify({ error: "fetch failed" }), { status: 502, headers: cors });
    }
  }
};
