// Offline support: the app shell is cached; live data is cached by the app itself (localStorage).
const CACHE = "dvl-v10";
const SHELL = ["./", "index.html", "style.css", "app.js", "manifest.webmanifest", "icon.svg", "icon-192.png", "icon-512.png", "apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const font = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (url.origin !== location.origin && !font) return; // APIs go straight to the network
  // network first (fresh after updates), cache as fallback when offline
  // "no-cache" makes the browser revalidate with the server, so a new release shows up on the next
  // open instead of after GitHub Pages' 10-minute HTTP cache expires
  // (navigations are rebuilt from the URL: some browsers refuse to copy a navigate-mode request with options)
  const net = font ? fetch(req) : fetch(req.mode === "navigate" ? req.url : req, { cache: "no-cache", credentials: "same-origin" });
  e.respondWith(net.then(res => {
    if (res.ok || res.type === "opaque") { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req).then(r => r || (req.mode === "navigate" ? caches.match("index.html") : Response.error()))));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window" }).then(cs => cs.length ? cs[0].focus() : self.clients.openWindow("./")));
});
