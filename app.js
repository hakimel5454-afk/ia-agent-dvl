"use strict";
/* IA AGENT DVL — front-end
   Sections: dashboard, markets, news, X, Telegram, sports, alerts, report.
   Data: Binance/Coinbase (prices), Cloudflare Worker (news, odds, live scores, fear & greed, Telegram). */

const WORKER = "https://ia-agent-dvl.hakimel5454.workers.dev";
const HOSTS = ["https://data-api.binance.vision", "https://api.binance.com"];
const COINS = [["BTC", "Bitcoin"], ["ETH", "Ethereum"], ["SOL", "Solana"], ["BNB", "BNB"], ["XRP", "XRP"], ["DOGE", "Dogecoin"], ["ADA", "Cardano"], ["TON", "Toncoin"]];
const IDS = ["dash", "mkt", "news", "x", "tg", "sport", "alert", "rep"];
const NAV_IC = ["dash", "btc", "globe", "x", "tg", "sport", "bell", "rep"];
const RANGES = { "1D": ["1h", 24], "1W": ["6h", 28], "1M": ["1d", 30], "1Y": ["1w", 52] };
const XH = ["BTCprice", "BangXBT", "ryukXBT"];
const TG_DEFAULT = ["cointelegraph", "whale_alert_io"];
const MIN = 60000;

/* ---------- icons ---------- */
const P = {
  dash: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  btc: '<circle cx="12" cy="12" r="9.5"/><path d="M9.5 7.5v8.6M9.5 7.5h3.2a2.1 2.1 0 0 1 0 4.2H9.5M9.5 11.7h3.8a2.2 2.2 0 0 1 0 4.4H9.5M11 6v1.5M13 6v1.5M11 16.1v1.6M13 16.1v1.6"/>',
  news: '<path d="M4 5h13v14H6a2 2 0 0 1-2-2z"/><path d="M17 9h3v8a2 2 0 0 1-2 2M7.5 9h6M7.5 12h6M7.5 15h3.5"/>',
  globe: '<g class="gl"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><ellipse cx="12" cy="12" rx="4.5" ry="9"/></g>',
  x: '<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>',
  tg: '<path d="M21.5 3.5 2.8 10.7l6.3 2.3 2.3 6.5 3.2-4.3 5 3.6z"/><path d="M9.1 13l12.4-9.5"/>',
  sport: '<circle cx="12" cy="12" r="9"/><path d="M12 8.2l3.4 2.5-1.3 4h-4.2l-1.3-4zM12 8.2V3M15.4 10.7l5-1.6M14.1 14.7l3 4.2M9.9 14.7l-3 4.2M8.6 10.7l-5-1.6"/>',
  bell: '<g class="bell"><path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z"/><path d="M10 21a2 2 0 0 0 4 0"/></g>',
  rep: '<path d="M7 3h8l4 4v14H7z"/><path d="M15 3v4h4M10 12h6M10 15h6M10 18h3"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'
};
function ic(n, c) {
  const f = n === "x";
  return '<svg class="i ' + (c || "") + '" viewBox="0 0 24 24" ' + (f ? 'fill="currentColor"' : 'fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"') + ' aria-hidden="true">' + P[n] + "</svg>";
}

/* ---------- translations ---------- */
const FNG_L = { "Extreme Fear": ["خوف شديد", "Peur extrême", "Extreme Fear"], "Fear": ["خوف", "Peur", "Fear"], "Neutral": ["محايد", "Neutre", "Neutral"], "Greed": ["طمع", "Cupidité", "Greed"], "Extreme Greed": ["طمع شديد", "Cupidité extrême", "Extreme Greed"] };
const T = {
  ar: {
    sub: "منصة المراقبة الذكية", nav: ["لوحة التحكم", "الأسواق", "الأخبار", "X", "Telegram", "الرياضة", "التنبيهات", "التقرير"],
    live: "مباشر", saved: "محفوظ", loading: "جارٍ التحميل…", err: "تعذّر التحميل، تحقّق من الاتصال.", offline: "أنت غير متصل، تُعرض آخر بيانات محفوظة.",
    btc: "بيتكوين", cr: "العملات الرقمية", fg: "الخوف والطمع", hi: "الأعلى 24س", lo: "الأدنى 24س", vo: "الحجم 24س",
    tA: "تنبيهات نشطة", tN: "أخبار اليوم", tM: "مباريات اليوم", tL: "مباشر الآن",
    news: "أخبار العالم", nc: ["الكل", "عالمي", "اقتصاد", "تقنية", "كريبتو"],
    xo: "فتح الحساب على X", xl: "جارٍ تحميل المنشورات…", xf: "تعذّر عرض المنشورات هنا، فقد يقيّد X العرض المدمج. اضغط الزر أدناه لفتح الحساب مباشرة.",
    tgT: "قنوات Telegram", tgPh: "اسم القناة، مثل cointelegraph", tgAdd: "إضافة", tgOpen: "فتح في Telegram", tgDel: "حذف القناة", tgErr: "تعذّر عرض هذه القناة، فقد تكون خاصة أو غير موجودة.", tgBad: "اسم قناة غير صالح.", subs: "مشترك", media: "📷 وسائط",
    sf: "مباريات اليوم", sfb: "⚽ فتح مباريات اليوم على Sofascore", sc: "النتائج المباشرة", all: "الكل", nos: "لا توجد مباريات في هذه الفترة.", ft: "انتهت",
    starHint: "اضغط ☆ لمتابعة مباراة: يصلك تنبيه عند بدايتها وعند كل هدف.",
    sports: "الاحتمالات", today: "اليوم", upc: "مباريات قادمة", nom: "لا توجد مباريات اليوم في هذه الدوريات.", upd: "آخر تحديث", rem: "الرصيد المتبقي", win: "احتمال فوز الفريق الأول",
    al: "تنبيهات الأسعار", above: "أعلى من", below: "أدنى من", price: "السعر بالدولار", add: "إضافة التنبيه", none: "لا توجد تنبيهات بعد.", active: "نشط", fired: "انطلق", rearm: "إعادة التفعيل", added: "تمت إضافة التنبيه ✓",
    aOpts: ["تنبيهات الأسعار", "بداية المباريات المتابَعة", "الأهداف ونهاية المباريات المتابَعة"],
    perm: "تفعيل إشعارات الهاتف", permOk: "الإشعارات مفعّلة ✓", permNo: "الإشعارات مرفوضة، فعّلها من إعدادات الهاتف.",
    note: "تعمل التنبيهات ما دام التطبيق مفتوحًا. على iPhone أضف التطبيق إلى الشاشة الرئيسية (iOS 16.4 أو أحدث) لتظهر كإشعارات.",
    theme: "المظهر", tog: "تبديل الوضع الفاتح/الداكن",
    nUp: (c, p) => c + " تجاوز " + p, nDn: (c, p) => c + " نزل تحت " + p, nKick: "بدأت المباراة", nGoal: "⚽ هدف!", nEnd: "انتهت المباراة",
    rp: "التقرير اليومي", rMkt: "السوق", rNews: "الأخبار", rSport: "الرياضة", rAl: "التنبيهات", share: "مشاركة التقرير", copied: "تم نسخ التقرير ✓", gen: "يُنشأ تلقائيًا من البيانات الحية", aiBy: "كتبه الذكاء الاصطناعي (Claude)", watch: "للمتابعة اليوم", aiWait: "جارٍ كتابة التقرير بالذكاء الاصطناعي…",
    rM: (p, c, b, w) => "البيتكوين عند " + p + " (" + c + " خلال 24 ساعة). الأفضل أداءً " + b + "، والأضعف " + w + ".",
    rF: (v, l) => "مؤشر الخوف والطمع عند " + v + " (" + l + ").",
    rN: n => n + " خبرًا منذ بداية اليوم. أبرز العناوين:",
    rS: (n, lv, ft) => n + " مباراة اليوم: " + lv + " مباشرة الآن و" + ft + " انتهت.",
    rFav: (tm, p) => "أبرز مرشح للفوز: " + tm + " بنسبة " + p + "%.",
    rA: (n, f) => n + " تنبيه نشط، و" + f + " انطلق اليوم.",
    rNone: "لا توجد بيانات كافية بعد.",
    sum: (c, n, m) => "البيتكوين " + c + " خلال 24 ساعة، " + n + " خبرًا اليوم، و" + m + " مباراة.",
    u: ["د", "س"]
  },
  fr: {
    sub: "Plateforme de veille intelligente", nav: ["Tableau", "Marchés", "Actualités", "X", "Telegram", "Sport", "Alertes", "Rapport"],
    live: "direct", saved: "en cache", loading: "Chargement…", err: "Échec du chargement, vérifiez la connexion.", offline: "Hors ligne : affichage des dernières données enregistrées.",
    btc: "Bitcoin", cr: "Cryptomonnaies", fg: "Peur & Cupidité", hi: "Haut 24h", lo: "Bas 24h", vo: "Vol. 24h",
    tA: "Alertes actives", tN: "Infos du jour", tM: "Matchs du jour", tL: "En direct",
    news: "Actualités mondiales", nc: ["Tout", "Monde", "Économie", "Tech", "Crypto"],
    xo: "Ouvrir le compte sur X", xl: "Chargement des posts…", xf: "Impossible d’afficher les posts ici : X limite parfois l’affichage intégré. Touchez le bouton ci-dessous pour ouvrir le compte.",
    tgT: "Canaux Telegram", tgPh: "Nom du canal, ex. cointelegraph", tgAdd: "Ajouter", tgOpen: "Ouvrir dans Telegram", tgDel: "Supprimer le canal", tgErr: "Impossible d’afficher ce canal (privé ou inexistant).", tgBad: "Nom de canal invalide.", subs: "abonnés", media: "📷 média",
    sf: "Matchs du jour", sfb: "⚽ Ouvrir les matchs du jour sur Sofascore", sc: "Scores en direct", all: "Tout", nos: "Aucun match sur cette période.", ft: "Terminé",
    starHint: "Touchez ☆ pour suivre un match : alerte au coup d’envoi et à chaque but.",
    sports: "Cotes", today: "Aujourd’hui", upc: "À venir", nom: "Aucun match aujourd’hui dans ces compétitions.", upd: "Mis à jour", rem: "Crédits restants", win: "Probabilité de victoire de l’équipe 1",
    al: "Alertes de prix", above: "Au-dessus de", below: "En dessous de", price: "Prix en USD", add: "Ajouter l’alerte", none: "Aucune alerte pour l’instant.", active: "active", fired: "déclenchée", rearm: "Réactiver", added: "Alerte ajoutée ✓",
    aOpts: ["Alertes de prix", "Coup d’envoi des matchs suivis", "Buts et fin des matchs suivis"],
    perm: "Activer les notifications", permOk: "Notifications activées ✓", permNo: "Notifications refusées : activez-les dans les réglages.",
    note: "Les alertes fonctionnent tant que l’app est ouverte. Sur iPhone, ajoutez l’app à l’écran d’accueil (iOS 16.4+) pour recevoir des notifications.",
    theme: "Apparence", tog: "Basculer clair/sombre",
    nUp: (c, p) => c + " au-dessus de " + p, nDn: (c, p) => c + " sous " + p, nKick: "Coup d’envoi", nGoal: "⚽ But !", nEnd: "Fin du match",
    rp: "Rapport quotidien", rMkt: "Marché", rNews: "Actualités", rSport: "Sport", rAl: "Alertes", share: "Partager le rapport", copied: "Rapport copié ✓", gen: "Généré automatiquement à partir des données en direct", aiBy: "Rédigé par l’IA (Claude)", watch: "À suivre aujourd’hui", aiWait: "L’IA rédige le rapport…",
    rM: (p, c, b, w) => "Le Bitcoin est à " + p + " (" + c + " sur 24 h). Meilleure performance : " + b + ", plus faible : " + w + ".",
    rF: (v, l) => "Indice Peur & Cupidité : " + v + " (" + l + ").",
    rN: n => n + " articles depuis ce matin. À la une :",
    rS: (n, lv, ft) => n + " matchs aujourd’hui : " + lv + " en direct et " + ft + " terminés.",
    rFav: (tm, p) => "Grand favori : " + tm + " (" + p + " %).",
    rA: (n, f) => n + " alerte(s) active(s), " + f + " déclenchée(s) aujourd’hui.",
    rNone: "Pas encore assez de données.",
    sum: (c, n, m) => "Bitcoin " + c + " sur 24 h, " + n + " articles aujourd’hui et " + m + " matchs.",
    u: ["min", "h"]
  },
  en: {
    sub: "Smart monitoring platform", nav: ["Dashboard", "Markets", "News", "X", "Telegram", "Sports", "Alerts", "Report"],
    live: "live", saved: "cached", loading: "Loading…", err: "Could not load, check your connection.", offline: "You are offline: showing the last saved data.",
    btc: "Bitcoin", cr: "Cryptocurrencies", fg: "Fear & Greed", hi: "24h High", lo: "24h Low", vo: "24h Vol",
    tA: "Active alerts", tN: "News today", tM: "Matches today", tL: "Live now",
    news: "World news", nc: ["All", "World", "Economy", "Tech", "Crypto"],
    xo: "Open account on X", xl: "Loading posts…", xf: "Could not show posts here: X sometimes restricts embeds. Tap the button below to open the account.",
    tgT: "Telegram channels", tgPh: "Channel name, e.g. cointelegraph", tgAdd: "Add", tgOpen: "Open in Telegram", tgDel: "Remove channel", tgErr: "Could not show this channel (private or missing).", tgBad: "Invalid channel name.", subs: "subscribers", media: "📷 media",
    sf: "Today’s matches", sfb: "⚽ Open today’s matches on Sofascore", sc: "Live scores", all: "All", nos: "No matches in this period.", ft: "FT",
    starHint: "Tap ☆ to follow a match: get alerted at kick-off and on every goal.",
    sports: "Odds", today: "Today", upc: "Upcoming", nom: "No matches today in these competitions.", upd: "Updated", rem: "Credits left", win: "Team 1 win probability",
    al: "Price alerts", above: "Above", below: "Below", price: "Price in USD", add: "Add alert", none: "No alerts yet.", active: "active", fired: "triggered", rearm: "Re-arm", added: "Alert added ✓",
    aOpts: ["Price alerts", "Kick-off of followed matches", "Goals and full-time of followed matches"],
    perm: "Enable phone notifications", permOk: "Notifications enabled ✓", permNo: "Notifications blocked: enable them in settings.",
    note: "Alerts work while the app is open. On iPhone, add the app to your Home Screen (iOS 16.4+) to get them as notifications.",
    theme: "Appearance", tog: "Toggle light/dark",
    nUp: (c, p) => c + " rose above " + p, nDn: (c, p) => c + " fell below " + p, nKick: "Kick-off", nGoal: "⚽ Goal!", nEnd: "Full time",
    rp: "Daily report", rMkt: "Market", rNews: "News", rSport: "Sports", rAl: "Alerts", share: "Share report", copied: "Report copied ✓", gen: "Generated automatically from live data", aiBy: "Written by AI (Claude)", watch: "Worth watching today", aiWait: "AI is writing the report…",
    rM: (p, c, b, w) => "Bitcoin is at " + p + " (" + c + " over 24h). Best performer: " + b + ", weakest: " + w + ".",
    rF: (v, l) => "Fear & Greed index at " + v + " (" + l + ").",
    rN: n => n + " stories since this morning. Top headlines:",
    rS: (n, lv, ft) => n + " matches today: " + lv + " live now and " + ft + " finished.",
    rFav: (tm, p) => "Strongest favourite: " + tm + " (" + p + "%).",
    rA: (n, f) => n + " active alert(s), " + f + " triggered today.",
    rNone: "Not enough data yet.",
    sum: (c, n, m) => "Bitcoin " + c + " over 24h, " + n + " stories today and " + m + " matches.",
    u: ["m", "h"]
  }
};

/* ---------- helpers ---------- */
const $ = id => document.getElementById(id);
function load(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
function save(k, v) { try { localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v)); } catch (e) { } }
function raw(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function fm(v, d) { return Number(v).toLocaleString("en-US", { maximumFractionDigits: d === undefined ? 2 : d }); }
function usd(v) { return "$" + fm(v, v >= 1000 ? 0 : v >= 1 ? 2 : 4); }
function compact(v) { return "$" + Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(v); }
function pctS(c) { return (c >= 0 ? "+" : "") + c.toFixed(2) + "%"; }
function ltr(s) { return "\u2066" + s + "\u2069"; } // keep numbers left-to-right inside Arabic text
function cv(c) { return '<span class="chg ' + (c >= 0 ? "up" : "dn") + '">' + (c >= 0 ? "▲ " : "▼ ") + pctS(c) + "</span>"; }
function LC() { return L === "ar" ? "ar-u-nu-latn" : L; }
function isToday(ts) { return new Date(ts).toDateString() === new Date().toDateString(); }
function hm(ts) { return new Date(ts).toLocaleTimeString(LC(), { hour: "2-digit", minute: "2-digit" }); }
function agoTs(ts, t) {
  if (!ts) return "";
  const m = Math.max(1, Math.round((Date.now() - ts) / MIN));
  if (m < 60) return m + " " + t.u[0];
  if (m < 1440) return Math.round(m / 60) + " " + t.u[1];
  return new Date(ts).toLocaleDateString(LC(), { day: "numeric", month: "short" });
}
function isDark() { const r = document.documentElement; return r.dataset.theme === "dark" || (!r.dataset.theme && matchMedia("(prefers-color-scheme:dark)").matches); }
function badge(kind, t) { return kind ? '<span class="demo">' + (kind === "live" ? t.live : t.saved) + "</span>" : ""; }
function hd(i, txt, kind, t, cls) { return '<div class="h">' + ic(i, cls) + "<span>" + txt + "</span>" + badge(kind, t) + "</div>"; }
function chart(a, h, area) {
  if (!a || a.length < 2) return "";
  const mn = Math.min.apply(null, a), mx = Math.max.apply(null, a), sp = mx - mn || 1, w = 320;
  const p = a.map((v, i) => (i * w / (a.length - 1)).toFixed(1) + " " + (h - 3 - (v - mn) / sp * (h - 8)).toFixed(1));
  const l = "M" + p.join("L");
  return '<svg class="' + (area ? "chart" : "spk") + " " + (a[a.length - 1] >= a[0] ? "up" : "dn") + '" viewBox="0 0 ' + w + " " + h + '" preserveAspectRatio="none" height="' + h + '">' + (area ? '<path class="ar" d="' + l + "L" + w + " " + h + "L0 " + h + 'z"/>' : "") + '<path class="ln" pathLength="1" d="' + l + '"/></svg>';
}
async function jget(url, ms) {
  const ac = new AbortController(), to = setTimeout(() => ac.abort(), ms || 8000);
  try { const r = await fetch(url, { signal: ac.signal }); if (!r.ok) return null; return await r.json(); }
  catch (e) { return null; } finally { clearTimeout(to); }
}
async function bget(path) { for (const h of HOSTS) { const d = await jget(h + path); if (d) return d; } return null; }

/* ---------- state ---------- */
let L = T[raw("lang")] ? raw("lang") : "ar";
let cur = "dash", rng = "1D", sel = "BTC", ncat = "all", xcur = XH[0], scat = "all", pending = false, xt = 0;
const CL = {};          // coin -> {p, c, h, l, v, s, d}
let CLT = 0, CLlive = false;
const KL = {};          // "BTC:1D" -> closes
let FNG = load("fng");
let NW = null, NWL = "", NWT = 0;
let SP = null, SPM = {}, SPT = 0;      // odds
let SC = load("scores"), SCT = 0;      // live scores
let TG = load("tg") || {};
let tgch = load("tgch"); if (!Array.isArray(tgch) || !tgch.length) tgch = TG_DEFAULT.slice();
let tgcur = tgch[0];
let alerts = load("alerts") || [];
let AI = {}, aiBusy = false; // AI report per language
["ar", "fr", "en"].forEach(l => { const a = load("ai_" + l); if (a && a.report) AI[l] = a; });
let stars = load("stars") || {};
let opts = load("aopts"); if (!Array.isArray(opts) || opts.length !== 3) opts = [true, true, true];

(function restore() {
  const c = load("coins");
  if (c && c.d) { Object.assign(CL, c.d); CLT = c.t || 0; }
  const nc = load("nw");
  if (nc && Array.isArray(nc.i) && nc.l === L) { NW = nc.i; NWL = nc.l; NWT = nc.t; }
  const sc = load("sp");
  if (sc && Array.isArray(sc.m)) { SP = sc.m; SPM = { updated: sc.u, remaining: sc.r }; SPT = sc.t; }
  const old = raw("thr"); // migrate the single old BTC threshold
  if (old && +old > 0) { alerts.push({ id: Date.now(), k: "BTC", dir: "up", v: +old, on: true }); save("alerts", alerts); try { localStorage.removeItem("thr"); } catch (e) { } }
  const th = raw("theme"); if (th) document.documentElement.dataset.theme = th;
  const cut = Date.now() - 2 * 864e5; // forget followed matches older than 2 days
  for (const id in stars) if (new Date(stars[id].time) < cut) delete stars[id];
})();

/* ---------- notifications ---------- */
let toastT = 0;
function toast(msg) {
  let el = $("toast");
  if (!el) { el = document.createElement("div"); el.id = "toast"; el.className = "toast"; el.setAttribute("role", "status"); document.body.appendChild(el); }
  el.textContent = msg; el.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, 5000);
}
async function notify(title, body, tag) {
  toast(title + (body ? " — " + body : ""));
  if (navigator.vibrate) navigator.vibrate([120, 60, 120]);
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const o = { body: body || "", tag: tag || title, icon: "icon-192.png", badge: "icon-192.png" };
  try {
    const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
    if (reg) { await reg.showNotification(title, o); return; }
    new Notification(title, o);
  } catch (e) { }
}
function checkPriceAlerts() {
  if (!opts[0]) return;
  const t = T[L]; let changed = false;
  for (const a of alerts) {
    const q = CL[a.k];
    if (!a.on || !q || !q.p) continue;
    if (a.dir === "up" ? q.p >= a.v : q.p <= a.v) {
      a.on = false; a.fired = Date.now(); changed = true;
      notify((a.dir === "up" ? t.nUp : t.nDn)(a.k, usd(a.v)), usd(q.p), "price-" + a.id);
    }
  }
  if (changed) save("alerts", alerts);
}
function checkStars(list) {
  const t = T[L]; let changed = false;
  for (const m of list) {
    const s = stars[m.id];
    if (!s) continue;
    const line = m.home + " " + m.hs + "-" + m.as + " " + m.away;
    if (opts[1] && s.state === "pre" && m.state === "in") notify(t.nKick, m.home + " × " + m.away, "kick-" + m.id);
    const before = (+s.hs || 0) + (+s.as || 0), now = (+m.hs || 0) + (+m.as || 0);
    if (opts[2] && s.state !== "pre" && now > before) notify(t.nGoal, line, "goal-" + m.id);
    else if (opts[2] && s.state === "in" && m.state === "post") notify(t.nEnd, line, "end-" + m.id);
    if (s.state !== m.state || s.hs !== m.hs || s.as !== m.as) { Object.assign(s, { state: m.state, hs: m.hs, as: m.as, time: m.time }); changed = true; }
  }
  if (changed) save("stars", stars);
}

/* ---------- views ---------- */
function coinKind() { return CLT ? (CLlive && Date.now() - CLT < 2 * MIN ? "live" : "saved") : null; }
function todayNews() { return NW ? NW.filter(x => isToday(x.d)).length : 0; }
function todayMatches() {
  if (SC && SC.matches) return SC.matches.filter(m => isToday(m.time));
  return SP ? SP.filter(m => isToday(m.time)) : [];
}
function bestWorst() {
  const l = COINS.map(c => c[0]).filter(k => CL[k] && CL[k].c != null).sort((a, b) => CL[b].c - CL[a].c);
  return l.length ? [l[0], l[l.length - 1]] : null;
}
function favourite() {
  let best = null;
  for (const m of (SP || []).filter(x => isToday(x.time) || new Date(x.time) > new Date())) {
    const o = m.odds || {};
    if (!o["1"] || !o.X || !o["2"]) continue;
    const s = 1 / o["1"] + 1 / o.X + 1 / o["2"];
    for (const [k, team] of [["1", m.home], ["2", m.away]]) {
      const p = (1 / o[k]) / s * 100;
      if (!best || p > best.p) best = { team, p, m };
    }
  }
  return best;
}
function fngLabel(f) { const l = FNG_L[f.label]; return l ? l[["ar", "fr", "en"].indexOf(L)] : f.label; }

function vDash(t) {
  const b = CL.BTC, kind = coinKind(), s = KL["BTC:1D"] || (b && b.s);
  const price = b && b.p ? '<div class="big ' + (b.d || (b.c >= 0 ? "up" : "dn")) + '">' + usd(b.p) + "</div>" + (b.c != null ? cv(b.c) : "") : '<div class="mut">' + t.loading + "</div>";
  const on = alerts.filter(a => a.on).length, tm = todayMatches(), lv = tm.filter(m => m.state === "in").length;
  const f = FNG ? '<span class="n">' + FNG.value + '</span><svg class="ring" viewBox="0 0 36 36" style="position:absolute;inset-inline-end:14px;bottom:14px"><circle class="bg" cx="18" cy="18" r="15.9"/><circle class="fg" cx="18" cy="18" r="15.9" pathLength="100" stroke-dasharray="' + FNG.value + ' 100"/></svg><span class="mut">' + esc(fngLabel(FNG)) + "</span>" : '<span class="n">–</span>';
  return '<div class="card inv">' + hd("btc", t.btc, kind, t, "coin hero") + price + chart(s, 90, 1) + "</div>"
    + '<div class="grid"><button class="card tile" data-go="mkt"><span class="mut">' + ic("btc", "coin") + t.fg + "</span>" + f + "</button>"
    + '<button class="card tile" data-go="alert"><span class="mut">' + ic("bell") + t.tA + '</span><span class="n">' + on + "</span></button>"
    + '<button class="card tile" data-go="news"><span class="mut">' + ic("globe") + t.tN + '</span><span class="n">' + (NW ? todayNews() : "–") + "</span></button>"
    + '<button class="card tile" data-go="sport"><span class="mut">' + ic("sport") + t.tM + '</span><span class="n">' + tm.length + "</span>" + (lv ? '<span class="live">' + lv + " " + t.tL + "</span>" : "") + "</button></div>"
    + '<div class="card rep">' + hd("rep", t.rp, null, t) + "<p>" + esc(summary(t)) + '</p><button class="btn ghost" data-go="rep">' + t.nav[7] + "</button></div>";
}
function aiFresh() { const a = AI[L]; return a && Date.now() - Date.parse(a.generated) < 12 * 60 * MIN ? a : null; }
function summary(t) {
  const a = aiFresh();
  if (a) return a.report.headline;
  const b = CL.BTC;
  if (!b || b.c == null) return t.rNone;
  return t.sum(ltr(pctS(b.c)), NW ? todayNews() : 0, todayMatches().length);
}
function vMkt(t) {
  const q = CL[sel], key = sel + ":" + rng, s = KL[key] || (rng === "1D" && q && q.s), kind = coinKind();
  const name = (COINS.find(c => c[0] === sel) || [sel, sel])[1];
  let top = '<div class="card">' + hd("btc", name + " · " + sel, kind, t, "coin");
  top += q && q.p ? '<div class="big ' + (q.d || (q.c >= 0 ? "up" : "dn")) + '">' + usd(q.p) + "</div>" + (q.c != null ? cv(q.c) : "") : '<div class="mut">' + t.loading + "</div>";
  top += chart(s, 130, 1);
  if (q && q.h) top += '<div class="st"><div><small>' + t.hi + "</small>" + usd(q.h) + "</div><div><small>" + t.lo + "</small>" + usd(q.l) + "</div><div><small>" + t.vo + "</small>" + compact(q.v) + "</div></div>";
  top += '<div class="rg" style="margin-top:14px">' + Object.keys(RANGES).map(k => '<button data-r="' + k + '" class="' + (k === rng ? "on" : "") + '">' + k + "</button>").join("") + "</div></div>";
  const list = '<div class="card">' + hd("dash", t.cr, kind, t) + COINS.map(([k, n]) => {
    const d = CL[k] || {};
    return '<button class="row' + (k === sel ? " sel" : "") + '" data-coin="' + k + '"><div class="av">' + k.slice(0, 4) + '</div><div class="grow"><b>' + n + "</b>" + (d.c != null ? cv(d.c) : '<span class="mut">' + k + "</span>") + "</div>" + chart(d.s, 32) + '<b style="direction:ltr;min-width:84px;text-align:end">' + (d.p ? usd(d.p) : "–") + "</b></button>";
  }).join("") + "</div>";
  return top + list;
}
function vNews(t) {
  if (!NW) return '<div class="card">' + hd("news", t.news, null, t) + '<div class="empty">' + (navigator.onLine ? t.loading : t.err) + "</div></div>";
  const CI = { world: "globe", economy: "news", tech: "dash", crypto: "btc" }, CK = ["all", "world", "economy", "tech", "crypto"];
  const it = NW.filter(x => ncat === "all" || x.c === ncat).slice(0, 25);
  return '<div class="card">' + hd("news", t.news, Date.now() - NWT < 30 * MIN ? "live" : "saved", t)
    + '<div class="chips">' + CK.map((k, i) => '<button data-nc="' + k + '" class="' + (k === ncat ? "on" : "") + '">' + t.nc[i] + "</button>").join("") + "</div>"
    + it.map(x => {
      const ok = /^https?:\/\//.test(x.l);
      return '<a class="row" ' + (ok ? 'href="' + esc(x.l) + '" target="_blank" rel="noopener"' : "") + ' style="text-decoration:none;color:inherit"><div class="av">' + ic(CI[x.c] || "news") + '</div><div class="grow"><b dir="auto">' + esc(x.t) + '</b><span class="chip">' + esc(x.s) + '</span><span class="mut">' + agoTs(x.d, t) + "</span></div></a>";
    }).join("") + "</div>";
}
function vX(t) {
  return '<div class="card"><div class="h">' + ic("x") + '<span>X (Twitter)</span></div><div class="rg">' + XH.map(h => '<button data-x="' + h + '" class="' + (h === xcur ? "on" : "") + '">@' + h + "</button>").join("")
    + '</div><div id="xbox" data-k="' + xcur + (isDark() ? "d" : "l") + '" style="margin-top:12px;min-height:200px"></div><a class="btn ghost" target="_blank" rel="noopener" style="display:block;text-align:center;text-decoration:none;box-sizing:border-box" href="https://x.com/' + xcur + '">' + t.xo + "</a></div>";
}
function vTg(t) {
  const d = TG[tgcur];
  let h = '<div class="card">' + hd("tg", t.tgT, d && d.posts ? (Date.now() - d.t < 15 * MIN ? "live" : "saved") : null, t)
    + '<div class="chips">' + tgch.map(c => '<button data-tg="' + esc(c) + '" class="' + (c === tgcur ? "on" : "") + '">@' + esc(c) + "</button>").join("") + "</div>"
    + '<div class="f2"><input id="tgin" class="sm" placeholder="' + t.tgPh + '" autocapitalize="off" autocorrect="off" spellcheck="false"><button class="btn" id="tgadd">' + t.tgAdd + "</button></div></div>";
  h += '<div class="card">';
  if (!tgcur) h += '<div class="empty">' + t.tgPh + "</div>";
  else if (!d) h += '<div class="empty">' + t.loading + "</div>";
  else if (!d.posts) h += '<div class="empty">' + t.tgErr + "</div>";
  else {
    h += '<div class="row"><div class="av">' + ic("tg") + '</div><div class="grow"><b dir="auto">' + esc(d.title) + '</b><span class="mut">@' + esc(d.ch) + (d.subs ? " · " + esc(d.subs) + " " + t.subs : "") + "</span></div></div>";
    h += d.posts.map(p => '<a class="row" href="' + esc(p.l) + '" target="_blank" rel="noopener" style="display:block;text-decoration:none;color:inherit"><div class="post" dir="auto">' + (p.text ? esc(p.text.length > 400 ? p.text.slice(0, 400) + "…" : p.text) : t.media) + '</div><div class="mut">' + agoTs(p.d, t) + "</div></a>").join("");
  }
  if (tgcur) h += '<div class="f2" style="margin-top:12px"><a class="btn ghost" style="text-align:center;text-decoration:none;margin:0" target="_blank" rel="noopener" href="https://t.me/' + esc(tgcur) + '">' + t.tgOpen + '</a><button class="btn ghost" id="tgdel" style="margin:0">' + t.tgDel + "</button></div>";
  return h + "</div>";
}
function scoreRow(m, t) {
  const st = !!stars[m.id], live = m.state === "in", pre = m.state === "pre";
  const hw = !pre && +m.hs > +m.as, aw = !pre && +m.as > +m.hs;
  const info = live ? '<span class="live">' + esc(m.detail || t.live) + "</span>" : m.state === "post" ? '<span class="mut">' + t.ft + "</span>" : '<span class="mut" dir="ltr">' + (isToday(m.time) ? "" : new Date(m.time).toLocaleDateString(LC(), { weekday: "short" }) + " ") + hm(m.time) + "</span>";
  return '<div class="row"><button class="star' + (st ? " on" : "") + '" data-star="' + esc(m.id) + '" aria-label="follow">' + (st ? "★" : "☆") + "</button>"
    + '<div class="tm"><span dir="auto" class="' + (hw ? "w" : "") + '">' + esc(m.home) + '</span><span dir="auto" class="' + (aw ? "w" : "") + '">' + esc(m.away) + "</span></div>"
    + '<div style="text-align:center;flex:none">' + (pre ? "" : '<div class="score">' + esc(m.hs) + " - " + esc(m.as) + "</div>") + info + "</div></div>";
}
function vScores(t) {
  if (!SC || !SC.matches) return '<div class="card">' + hd("sport", t.sc, null, t) + '<div class="empty">' + (navigator.onLine ? t.loading : t.err) + "</div></div>";
  const all = SC.matches.filter(m => isToday(m.time) || m.state === "in" || stars[m.id]);
  const lgs = [...new Set(all.map(m => m.league))];
  if (scat !== "all" && scat !== "star" && !lgs.includes(scat)) scat = "all";
  const list = all.filter(m => scat === "all" || (scat === "star" ? stars[m.id] : m.league === scat));
  const order = { in: 0, pre: 1, post: 2 };
  const groups = {};
  list.sort((a, b) => order[a.state] - order[b.state] || a.time.localeCompare(b.time)).forEach(m => { (groups[m.league] = groups[m.league] || []).push(m); });
  let h = '<div class="card">' + hd("sport", t.sc + " · " + t.today, Date.now() - SCT < 3 * MIN ? "live" : "saved", t)
    + '<div class="chips"><button data-sc="all" class="' + (scat === "all" ? "on" : "") + '">' + t.all + '</button><button data-sc="star" class="' + (scat === "star" ? "on" : "") + '">★</button>'
    + lgs.map(l => '<button data-sc="' + esc(l) + '" class="' + (l === scat ? "on" : "") + '">' + esc(l) + "</button>").join("") + "</div>";
  const ks = Object.keys(groups);
  h += ks.length ? ks.map(l => '<div class="mut" style="margin:10px 0 2px;font-weight:600">' + esc(l) + "</div>" + groups[l].map(m => scoreRow(m, t)).join("")).join("") : '<div class="empty">' + t.nos + "</div>";
  return h + '<div class="mut" style="margin-top:10px">' + t.starHint + "</div></div>";
}
function oddsRow(m, t) {
  const o = m.odds || {}, ks = ["1", "X", "2"], v = ks.map(k => o[k]), have = v.every(Boolean), mn = have ? Math.min.apply(null, v) : 0;
  const dt = isToday(m.time) ? "" : new Date(m.time).toLocaleDateString(LC(), { weekday: "short", day: "numeric", month: "short" }) + " ";
  const p = have ? (1 / o["1"]) / (1 / o["1"] + 1 / o.X + 1 / o["2"]) * 100 : 0;
  return '<div class="row" style="display:block"><div style="display:flex;justify-content:space-between;gap:8px"><b dir="auto">' + esc(m.home) + " × " + esc(m.away) + '</b><span class="mut" dir="ltr">' + dt + hm(m.time) + '</span></div><div class="mut" style="margin-top:2px"><span class="chip">' + esc(m.league) + "</span>" + esc(m.book || "") + "</div>"
    + (have ? '<div class="odds">' + ks.map((k, j) => '<div class="' + (v[j] === mn ? "top1" : "") + '"><small>' + k + "</small>" + v[j].toFixed(2) + "</div>").join("") + '</div><div class="bar"><i style="width:' + p.toFixed(0) + '%"></i></div><div class="mut" style="margin-top:4px">' + t.win + " · " + p.toFixed(0) + "%</div>" : "") + "</div>";
}
function vSport(t) {
  let h = '<div class="card"><div class="h">' + ic("sport") + "<span>" + t.sf + '</span></div><a class="btn" target="_blank" rel="noopener" style="display:block;text-align:center;text-decoration:none;box-sizing:border-box;margin:0" href="https://www.sofascore.com/football">' + t.sfb + "</a></div>";
  h += vScores(t);
  if (SP) {
    const now = new Date(), td = SP.filter(m => isToday(m.time)), up = SP.filter(m => !isToday(m.time) && new Date(m.time) > now).slice(0, 8);
    h += '<div class="card">' + hd("sport", t.sports + " · " + t.today, Date.now() - SPT < 13 * 60 * MIN ? "live" : "saved", t) + (td.length ? td.map(m => oddsRow(m, t)).join("") : '<div class="empty">' + t.nom + "</div>") + "</div>";
    if (up.length) h += '<div class="card"><div class="h"><span>' + t.upc + "</span></div>" + up.map(m => oddsRow(m, t)).join("") + "</div>";
    if (SPM.updated) h += '<div class="mut" style="margin:4px 4px 12px">' + t.upd + ": " + hm(SPM.updated) + (SPM.remaining ? " · " + t.rem + ": " + esc(SPM.remaining) : "") + "</div>";
  }
  return h;
}
function vAlert(t) {
  const q = CL.BTC;
  let h = '<div class="card">' + hd("bell", t.al, null, t)
    + '<div class="f2"><select id="acoin" aria-label="coin">' + COINS.map(([k]) => '<option value="' + k + '">' + k + "</option>").join("") + '</select><select id="adir" aria-label="direction"><option value="up">' + t.above + '</option><option value="dn">' + t.below + "</option></select></div>"
    + '<input id="aval" type="number" inputmode="decimal" style="margin-top:8px" placeholder="' + (q && q.p ? fm(Math.round(q.p)).replace(/,/g, "") : t.price) + '" aria-label="' + t.price + '">'
    + '<button class="btn" id="aadd">' + t.add + "</button>";
  h += alerts.length ? '<div style="margin-top:10px">' + alerts.map(a => {
    const p = CL[a.k] && CL[a.k].p;
    return '<div class="row"><div class="av">' + a.k.slice(0, 4) + '</div><div class="grow"><b dir="ltr" style="text-align:start">' + a.k + " " + (a.dir === "up" ? "≥" : "≤") + " " + usd(a.v) + '</b><span class="mut">' + (a.on ? t.active : t.fired + " · " + agoTs(a.fired, T[L])) + (p ? " · " + usd(p) : "") + "</span></div>"
      + (a.on ? "" : '<button class="btn ghost" data-rearm="' + a.id + '" style="width:auto;margin:0;padding:6px 10px;font-size:12px">' + t.rearm + "</button>")
      + '<button class="x" data-adel="' + a.id + '" aria-label="delete">×</button></div>';
  }).join("") + "</div>" : '<div class="empty">' + t.none + "</div>";
  h += "</div>";
  const np = "Notification" in window ? Notification.permission : "na";
  h += '<div class="card">' + t.aOpts.map((c, i) => '<div class="sw"><span>' + c + '</span><button role="switch" data-opt="' + i + '" aria-checked="' + opts[i] + '"></button></div>').join("")
    + (np === "na" ? "" : np === "granted" ? '<div class="mut" style="margin-top:10px">' + t.permOk + "</div>" : np === "denied" ? '<div class="mut" style="margin-top:10px">' + t.permNo + "</div>" : '<button class="btn" id="perm">' + t.perm + "</button>")
    + '<div class="mut" style="margin-top:10px">' + t.note + "</div></div>";
  h += '<div class="card"><div class="h"><span>' + t.theme + '</span></div><button class="btn ghost" id="tb" style="margin:0">' + t.tog + "</button></div>";
  return h;
}
function reportData(t) {
  const out = [], b = CL.BTC, bw = bestWorst();
  const mk = [];
  if (b && b.p && b.c != null && bw) mk.push(t.rM(ltr(usd(b.p)), ltr(pctS(b.c)), ltr(bw[0] + " " + pctS(CL[bw[0]].c)), ltr(bw[1] + " " + pctS(CL[bw[1]].c))));
  if (FNG) mk.push(t.rF(FNG.value, fngLabel(FNG)));
  out.push([t.rMkt, mk, []]);
  if (NW) {
    const top = NW.filter(x => isToday(x.d)).slice(0, 4);
    out.push([t.rNews, [t.rN(todayNews())], top.map(x => ({ text: x.t + " — " + x.s, link: x.l }))]);
  }
  const tm = todayMatches(), sp = [], res = [];
  if (tm.length) {
    sp.push(t.rS(tm.length, tm.filter(m => m.state === "in").length, tm.filter(m => m.state === "post").length));
    tm.filter(m => m.state !== "pre" && m.hs !== undefined).slice(0, 6).forEach(m => res.push({ text: m.home + " " + ltr(m.hs + "-" + m.as) + " " + m.away + (m.state === "in" ? " (" + (m.detail || t.live) + ")" : "") }));
  }
  const fv = favourite();
  if (fv) sp.push(t.rFav(fv.team, fv.p.toFixed(0)));
  if (sp.length) out.push([t.rSport, sp, res]);
  out.push([t.rAl, [t.rA(alerts.filter(a => a.on).length, alerts.filter(a => a.fired && isToday(a.fired)).length)], []]);
  return out;
}
function dateStr() { return new Date().toLocaleDateString(LC(), { weekday: "long", day: "numeric", month: "long" }); }
function reportText(t) {
  const a = aiFresh();
  if (a) {
    const r = a.report, li = reportData(t);
    return "IA AGENT DVL · " + t.rp + "\n" + dateStr() + "\n\n" + r.headline + "\n\n▪ " + t.rMkt + "\n" + r.market + "\n\n▪ " + t.rNews + "\n" + r.news + "\n\n▪ " + t.rSport + "\n" + r.sports
      + (r.watch.length ? "\n\n▪ " + t.watch + "\n" + r.watch.map(x => "• " + x).join("\n") : "") + "\n\n" + t.aiBy;
  }
  return "IA AGENT DVL · " + t.rp + "\n" + dateStr() + "\n\n" + reportData(t).map(([h, ps, li]) => "▪ " + h + "\n" + (ps.length ? ps.join(" ") : t.rNone) + (li.length ? "\n" + li.map(x => "• " + x.text).join("\n") : "")).join("\n\n");
}
function vRepAi(t, a) {
  const r = a.report, d = reportData(t), lists = {};
  d.forEach(([h, , li]) => { lists[h] = li; });
  const ul = li => li && li.length ? "<ul>" + li.map(x => '<li dir="auto">' + (x.link ? '<a href="' + esc(x.link) + '" target="_blank" rel="noopener">' + esc(x.text) + "</a>" : esc(x.text)) + "</li>").join("") + "</ul>" : "";
  const sec = (h, txt, li) => '<div class="row"><h3 style="margin:0">' + h + '</h3><p style="font-size:14px" dir="auto">' + esc(txt) + "</p>" + ul(li) + "</div>";
  const al = d.find(x => x[0] === t.rAl);
  return '<div class="card inv rep">' + hd("rep", t.rp, null, t) + '<div style="font:700 20px Inter,\'IBM Plex Sans Arabic\',sans-serif">' + dateStr() + '</div><p style="opacity:.85;font-size:16px;font-weight:600" dir="auto">' + esc(r.headline) + "</p></div>"
    + '<div class="card rep">' + sec(t.rMkt, r.market) + sec(t.rNews, r.news, lists[t.rNews]) + sec(t.rSport, r.sports, lists[t.rSport])
    + (r.watch.length ? '<div class="row"><h3 style="margin:0">' + t.watch + "</h3>" + ul(r.watch.map(x => ({ text: x }))) + "</div>" : "")
    + sec(t.rAl, al ? al[1].join(" ") : "")
    + '<button class="btn" id="share">' + t.share + '</button><div class="mut" style="margin-top:10px">✨ ' + t.aiBy + " · " + hm(a.generated) + "</div></div>";
}
function vRep(t) {
  const a = aiFresh();
  if (a) return vRepAi(t, a);
  const d = reportData(t);
  return '<div class="card inv rep">' + hd("rep", t.rp, null, t) + '<div style="font:700 20px Inter,\'IBM Plex Sans Arabic\',sans-serif">' + dateStr() + '</div><p style="opacity:.8">' + esc(summary(t)) + "</p></div>"
    + '<div class="card rep">' + d.map(([h, ps, li]) => '<div class="row"><h3 style="margin:0">' + h + '</h3><p style="font-size:14px">' + esc(ps.length ? ps.join(" ") : t.rNone) + "</p>"
      + (li.length ? "<ul>" + li.map(x => '<li dir="auto">' + (x.link ? '<a href="' + esc(x.link) + '" target="_blank" rel="noopener">' + esc(x.text) + "</a>" : esc(x.text)) + "</li>").join("") + "</ul>" : "") + "</div>").join("")
    + '<button class="btn" id="share">' + t.share + '</button><div class="mut" style="margin-top:10px">' + (aiBusy ? t.aiWait : t.gen) + "</div></div>";
}
const VIEWS = { dash: vDash, mkt: vMkt, news: vNews, x: vX, tg: vTg, sport: vSport, alert: vAlert, rep: vRep };

/* ---------- render (only sections whose HTML changed are replaced) ---------- */
const last = {};
function typing() { const a = document.activeElement; return a && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName) && a.closest("#app"); }
function render() {
  if (typing()) { pending = true; return; }
  pending = false;
  const t = T[L], r = document.documentElement;
  r.lang = L; r.dir = L === "ar" ? "rtl" : "ltr";
  $("sub").textContent = t.sub;
  document.querySelectorAll("#lg button").forEach(b => b.classList.toggle("on", b.dataset.l === L));
  $("th").innerHTML = ic(isDark() ? "sun" : "moon");
  const meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.content = isDark() ? "#000000" : "#ffffff";
  $("off").hidden = navigator.onLine; $("off").textContent = t.offline;
  for (const id of IDS) {
    let el = $("s-" + id);
    if (!el) { el = document.createElement("section"); el.id = "s-" + id; el.className = "sec"; $("app").appendChild(el); }
    el.classList.toggle("on", id === cur);
    const h = VIEWS[id](t);
    if (h !== last[id]) {
      el.innerHTML = h; last[id] = h;
      if (id === "x" && cur === "x") loadX();
    }
  }
  const nav = IDS.map((id, i) => '<button data-s="' + id + '" class="' + (id === cur ? "on" : "") + '">' + ic(NAV_IC[i]) + t.nav[i] + "</button>").join("");
  if (nav !== last.nav) { $("nav").innerHTML = nav; last.nav = nav; }
}
function go(id) {
  cur = id;
  const sec = $("s-" + id);
  render();
  const a = document.querySelector("nav .on"); if (a && a.scrollIntoView) a.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  window.scrollTo(0, 0);
  if (sec) { sec.classList.remove("anim"); void sec.offsetWidth; sec.classList.add("anim"); setTimeout(() => sec.classList.remove("anim"), 1500); }
  if (id === "x") loadX();
  if (id === "sport") { loadSports(); loadScores(true); }
  if (id === "news") loadNews();
  if (id === "tg") loadTg(tgcur);
  if (id === "mkt") loadSeries(sel, rng);
  if (id === "rep") loadAi();
}

/* ---------- events ---------- */
document.addEventListener("focusout", () => setTimeout(() => { if (pending && !typing()) render(); }, 0));
document.addEventListener("click", e => {
  const g = s => e.target.closest(s); let b;
  const t = T[L];
  if ((b = g("#lg button"))) { L = b.dataset.l; save("lang", L); render(); loadNews(true); loadAi(); }
  else if ((b = g("nav button"))) go(b.dataset.s);
  else if ((b = g("[data-go]"))) go(b.dataset.go);
  else if ((b = g("[data-nc]"))) { ncat = b.dataset.nc; render(); }
  else if ((b = g("[data-x]"))) { xcur = b.dataset.x; render(); }
  else if ((b = g("[data-r]"))) { rng = b.dataset.r; render(); loadSeries(sel, rng); }
  else if ((b = g("[data-coin]"))) { sel = b.dataset.coin; render(); loadSeries(sel, rng); window.scrollTo({ top: 0, behavior: "smooth" }); }
  else if ((b = g("[data-sc]"))) { scat = b.dataset.sc; render(); }
  else if ((b = g("[data-star]"))) {
    const id = b.dataset.star, m = SC && SC.matches.find(x => x.id === id);
    if (stars[id]) delete stars[id]; else if (m) stars[id] = { home: m.home, away: m.away, time: m.time, state: m.state, hs: m.hs, as: m.as };
    save("stars", stars); render();
  }
  else if ((b = g("[data-tg]"))) { tgcur = b.dataset.tg; render(); loadTg(tgcur); }
  else if (g("#tgadd")) {
    let v = ($("tgin").value || "").trim().replace(/^https?:\/\/(t\.me|telegram\.me)\/(s\/)?/i, "").replace(/^@/, "").split(/[/?#]/)[0];
    if (!/^[A-Za-z][A-Za-z0-9_]{3,31}$/.test(v)) { toast(t.tgBad); return; }
    if (!tgch.includes(v)) { tgch.push(v); save("tgch", tgch); }
    tgcur = v; $("tgin").value = ""; $("tgin").blur(); render(); loadTg(v);
  }
  else if (g("#tgdel")) { tgch = tgch.filter(c => c !== tgcur); save("tgch", tgch); tgcur = tgch[0] || ""; render(); if (tgcur) loadTg(tgcur); }
  else if (g("#aadd")) {
    const v = parseFloat(($("aval").value || "").replace(",", "."));
    if (!(v > 0)) { $("aval").focus(); return; }
    alerts.push({ id: Date.now(), k: $("acoin").value, dir: $("adir").value, v, on: true });
    save("alerts", alerts); $("aval").value = ""; $("aval").blur(); toast(t.added); render(); checkPriceAlerts();
  }
  else if ((b = g("[data-adel]"))) { alerts = alerts.filter(a => String(a.id) !== b.dataset.adel); save("alerts", alerts); render(); }
  else if ((b = g("[data-rearm]"))) { const a = alerts.find(x => String(x.id) === b.dataset.rearm); if (a) { a.on = true; delete a.fired; save("alerts", alerts); render(); } }
  else if ((b = g("[data-opt]"))) { const i = +b.dataset.opt; opts[i] = !opts[i]; save("aopts", opts); render(); }
  else if (g("#perm")) { Notification.requestPermission().then(() => render()); }
  else if (g("#share")) {
    const txt = reportText(t);
    if (navigator.share) navigator.share({ title: "IA AGENT DVL", text: txt }).catch(() => { });
    else if (navigator.clipboard) navigator.clipboard.writeText(txt).then(() => toast(t.copied));
  }
  else if (g("#tb") || g("#th")) { const r = document.documentElement; r.dataset.theme = isDark() ? "light" : "dark"; save("theme", r.dataset.theme); render(); }
});
document.addEventListener("keydown", e => {
  if (e.key !== "Enter") return;
  if (e.target.id === "tgin") $("tgadd").click();
  if (e.target.id === "aval") $("aadd").click();
});
window.addEventListener("online", () => { render(); refreshAll(); });
window.addEventListener("offline", render);
document.addEventListener("visibilitychange", () => { if (!document.hidden) refreshAll(); });

/* ---------- data loading ---------- */
async function refreshCoins() {
  const syms = COINS.map(c => c[0] + "USDT");
  const d = await bget("/api/v3/ticker/24hr?symbols=" + encodeURIComponent(JSON.stringify(syms)));
  let ok = false;
  const upd = (k, o) => { const prev = CL[k] && CL[k].p; CL[k] = Object.assign(CL[k] || {}, o); if (prev && o.p !== prev) CL[k].d = o.p > prev ? "up" : "dn"; ok = true; };
  if (Array.isArray(d)) {
    d.forEach(o => upd(o.symbol.replace(/USDT$/, ""), { p: +o.lastPrice, c: +o.priceChangePercent, h: +o.highPrice, l: +o.lowPrice, v: +o.quoteVolume }));
  } else {
    await Promise.all(COINS.map(async ([k]) => {
      const j = await jget("https://api.coinbase.com/v2/prices/" + k + "-USD/spot");
      const p = j && j.data && +j.data.amount;
      if (p) upd(k, { p });
    }));
  }
  if (!ok) return;
  CLT = Date.now(); CLlive = true;
  save("coins", { t: CLT, d: CL });
  checkPriceAlerts(); render();
}
let sparkT = 0;
async function loadSparks() {
  if (Date.now() - sparkT < 10 * MIN) return;
  sparkT = Date.now();
  await Promise.all(COINS.map(async ([k]) => {
    const z = await bget("/api/v3/klines?symbol=" + k + "USDT&interval=1h&limit=24");
    if (Array.isArray(z) && z.length > 1) { CL[k] = CL[k] || {}; CL[k].s = z.map(x => +x[4]); KL[k + ":1D"] = CL[k].s; }
  }));
  render();
}
async function loadSeries(k, r) {
  const key = k + ":" + r;
  if (KL[key]) return;
  const c = RANGES[r], d = await bget("/api/v3/klines?symbol=" + k + "USDT&interval=" + c[0] + "&limit=" + c[1]);
  if (!Array.isArray(d) || d.length < 2) return;
  KL[key] = d.map(x => +x[4]); render();
}
async function loadFng() {
  if (FNG && Date.now() - (FNG.f || 0) < 30 * MIN) return;
  let d = await jget(WORKER + "/fng");
  if (!d || d.value == null) {
    const j = await jget("https://api.alternative.me/fng/?limit=1");
    const x = j && j.data && j.data[0];
    d = x ? { value: +x.value, label: x.value_classification } : null;
  }
  if (!d || d.value == null) return;
  FNG = Object.assign(d, { f: Date.now() }); save("fng", FNG); render();
}
async function loadNews(force) {
  if (!force && NW && NWL === L && Date.now() - NWT < 10 * MIN) return;
  if (NWL !== L) { const nc = load("nw"); if (nc && nc.l === L) { NW = nc.i; NWL = L; NWT = nc.t; render(); } }
  const lg = L, d = await jget(WORKER + "/news?lang=" + lg, 15000);
  if (!d || !Array.isArray(d.items) || !d.items.length || lg !== L) return;
  NW = d.items; NWL = lg; NWT = Date.now(); save("nw", { l: lg, i: NW, t: NWT }); render();
}
async function loadSports() {
  if (SP && Date.now() - SPT < 10 * MIN) return;
  const d = await jget(WORKER + "/matches", 15000);
  if (!d || !Array.isArray(d.matches)) return;
  SP = d.matches; SPM = { updated: d.updated, remaining: d.remaining }; SPT = Date.now();
  save("sp", { m: SP, u: d.updated, r: d.remaining, t: SPT }); render();
}
function starsActive() {
  const now = Date.now();
  return Object.values(stars).some(s => s.state === "in" || (s.state === "pre" && new Date(s.time) - now < 15 * MIN));
}
async function loadScores(force) {
  const age = Date.now() - SCT;
  if (!force && age < 5 * MIN && !starsActive() && !(cur === "sport" && age >= MIN)) return;
  if (force && age < 40000) return;
  const d = await jget(WORKER + "/scores", 15000);
  if (!d || !Array.isArray(d.matches)) return;
  SC = { updated: d.updated, matches: d.matches }; SCT = Date.now();
  save("scores", SC); checkStars(d.matches); render();
}
async function loadTg(ch) {
  if (!ch) return;
  const c = TG[ch];
  if (c && Date.now() - c.t < 5 * MIN) return;
  const d = await jget(WORKER + "/tg?ch=" + encodeURIComponent(ch), 12000);
  if (d && Array.isArray(d.posts)) TG[ch] = Object.assign(d, { t: Date.now() });
  else if (!c || !c.posts) TG[ch] = { ch, t: Date.now(), err: true };
  else return;
  const keep = {}; tgch.forEach(k => { if (TG[k] && TG[k].posts) keep[k] = TG[k]; }); save("tg", keep);
  render();
}
async function loadAi() {
  const lg = L, a = AI[lg];
  if (aiBusy || (a && Date.now() - Date.parse(a.generated) < 3 * 60 * MIN)) return;
  aiBusy = true; render();
  const d = await jget(WORKER + "/report?lang=" + lg, 90000);
  aiBusy = false;
  if (d && d.report && d.report.headline) { AI[lg] = d; save("ai_" + lg, d); }
  render();
}
function loadX() {
  const b = $("xbox"); if (!b) return;
  b.innerHTML = '<div class="mut">' + T[L].xl + '</div><a class="twitter-timeline" data-height="560" data-dnt="true" data-chrome="noheader nofooter transparent" data-theme="' + (isDark() ? "dark" : "light") + '" href="https://twitter.com/' + xcur + '"></a>';
  const tok = ++xt;
  const ld = () => { const q = $("xbox"); if (q && window.twttr && window.twttr.widgets) window.twttr.widgets.load(q); };
  if (window.twttr && window.twttr.widgets) ld();
  else if (!$("twjs")) { const sc = document.createElement("script"); sc.id = "twjs"; sc.async = true; sc.src = "https://platform.twitter.com/widgets.js"; sc.onload = ld; document.head.appendChild(sc); }
  else setTimeout(ld, 800);
  setTimeout(() => { if (tok !== xt) return; const q = $("xbox"); if (q && !q.querySelector("iframe")) q.innerHTML = '<div class="mut">' + T[L].xf + "</div>"; }, 9000);
}
function refreshAll() {
  if (!navigator.onLine) return;
  refreshCoins(); loadSparks(); loadFng(); loadNews(); loadSports(); loadScores(); loadAi();
  if (cur === "tg") loadTg(tgcur);
}

/* ---------- start ---------- */
render();
refreshAll();
loadSeries("BTC", "1D");
setInterval(() => { if (!document.hidden) refreshCoins(); }, 15000);
setInterval(() => { if (!document.hidden) { loadScores(); loadSparks(); loadFng(); loadNews(); } }, MIN);
if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("sw.js").catch(() => { });
