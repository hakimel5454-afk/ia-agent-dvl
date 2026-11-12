const ORIGIN = "https://hakimel5454-afk.github.io";
const LEAGUES = {
  soccer_uefa_champs_league: "UCL",
  soccer_epl: "Premier League",
  soccer_spain_la_liga: "La Liga",
  soccer_germany_bundesliga: "Bundesliga",
  soccer_italy_serie_a: "Serie A",
  soccer_france_ligue_one: "Ligue 1"
};
const TTL = 12 * 3600 * 1000;
let cache = null;
const cors = { "Access-Control-Allow-Origin": ORIGIN, "Content-Type": "application/json; charset=utf-8" };

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: { ...cors, "Access-Control-Allow-Methods": "GET", "Access-Control-Allow-Headers": "*" } });
    }
    const u = new URL(req.url);
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
